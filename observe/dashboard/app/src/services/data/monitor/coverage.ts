import { EntitySchema } from '@whylabs/songbird-node-client';

import { metricToGQLCategory } from '../../../graphql/contract-converters/data-service/analyzer-results-converter';
import { AlertCategory, MonitorCoverage } from '../../../graphql/generated/graphql';
import { getLogger } from '../../../providers/logger';
import { Analyzer, Monitor } from '../../../schemas/generated/monitor-schema';
import { runAll } from '../../../util/async-helpers';
import { OperationContext } from '../../../util/misc';
import { getMonitorConfigV3 } from '../songbird/api-wrappers/monitor-config';
import { getModels } from '../songbird/api-wrappers/resources';

const logger = getLogger('MonitorCoverageLogger');

export type PartialMonitorConfig = Record<string, unknown> & {
  analyzers?: Analyzer[];
  monitors?: Monitor[];
  entitySchema?: EntitySchema;
};

/**
 * Returns the categories covered by the monitor config based on the metrics used by the analyzers
 * @param config
 */
export const getCoveredCategories = (
  config: PartialMonitorConfig | null,
  context?: OperationContext,
): AlertCategory[] => {
  const coveredCategories: Set<AlertCategory> = new Set([]);

  config?.analyzers?.forEach((analyzer) => {
    // Verify if the analyzer is not disabled and has config.metric
    if (!analyzer.disabled && 'metric' in analyzer.config && analyzer.config?.metric) {
      const metric = metricToGQLCategory(analyzer.config.metric, context);
      coveredCategories.add(metric);
    }
  });
  return [...coveredCategories];
};

export type DatasetMonitorCoverage = {
  datasetId: string;
  coveredCategories: AlertCategory[];
};

/**
 * Returns monitor coverage for an org based on the coverage for each dataset.
 * @param datasetCoverages
 * @param totalDatasetCount
 */
export const calculateMonitorCoverageForOrg = (
  datasetCoverages: DatasetMonitorCoverage[],
  totalDatasetCount: number,
): MonitorCoverage[] => {
  // map of category -> set of datasets covered for that category
  const coverageByCategory = new Map<AlertCategory, Set<string>>();
  datasetCoverages.forEach((coverage) => {
    coverage.coveredCategories.forEach((category) => {
      const datasets = coverageByCategory.get(category) ?? new Set<string>();
      datasets.add(coverage.datasetId);
      coverageByCategory.set(category, datasets);
    });
  });

  return [...coverageByCategory.entries()].map(([category, datasets]) => ({
    category,
    coveredDatasets: [...datasets],
    coverage: datasets.size / totalDatasetCount,
  }));
};

/**
 * Gets monitor coverage for all datasets in an org.
 * @param orgId
 */
export const getMonitorCoverageForOrg = async (orgId: string): Promise<MonitorCoverage[]> => {
  // TODO: Switch to a dedicated API for getting all configs in an org (or better yet move all of this to Songbird/DataService).
  // The current approach of getting all models and then their configs won't scale well.
  const allDatasets = await getModels(orgId);
  const { successes: coverages, failures } = await runAll(
    ...allDatasets.map(async (dataset) => {
      const coveredCategories = await getMonitorCoverageForDataset(orgId, dataset.id);
      const coverage: DatasetMonitorCoverage = {
        datasetId: dataset.id,
        coveredCategories,
      };
      return coverage;
    }),
  );

  if (failures.length) {
    logger.error(
      'Failed to get monitor configs for %s datasets in org %s: %s',
      failures.length,
      orgId,
      failures.map((f) => f.toString()).join(', '),
    );
  }

  return calculateMonitorCoverageForOrg(coverages, allDatasets.length);
};

/**
 * Gets monitor coverage for a specific resource.
 * @param orgId
 * @param resourceId
 */
export const getMonitorCoverageForDataset = async (orgId: string, resourceId: string): Promise<AlertCategory[]> => {
  const config = await getMonitorConfigV3(orgId, resourceId);
  return getCoveredCategories(config, { dataType: 'monitorConfig', orgId, datasetId: resourceId });
};

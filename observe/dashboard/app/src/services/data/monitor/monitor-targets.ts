import { DiscretenessType } from '@whylabs/data-service-node-client';

import { SegmentTag } from '../../../graphql/generated/graphql';
import { CallOptions } from '../../../util/async-helpers';
import { translateJsonObject } from '../../../util/json-utils';
import { isString } from '../../../util/type-guards';
import { ColumnSchema } from '../datasources/helpers/entity-schema';
import { getSchemaForResource } from '../songbird/api-wrappers/entity-schema';
import { getAnalyzer, getMonitor, getMonitorConfigV3 } from '../songbird/api-wrappers/monitor-config';
import { filterAnalyzerBySegments, filterAnalyzersByColumn, filterColumnsByTargetMatrix } from './utils';

export const filterColumnsByMonitorTarget = async (
  orgId: string,
  datasetId: string,
  monitorId: string,
  columns: ColumnSchema[],
  options?: CallOptions,
): Promise<string[]> => {
  const monitor = await getMonitor(orgId, datasetId, monitorId, options); // API client says the return type is string but in fact is an object
  const parsedMonitor = translateJsonObject(monitor);
  const { analyzerIds } = parsedMonitor ?? {};
  if (!analyzerIds || !Array.isArray(analyzerIds) || !analyzerIds.length || !columns?.length) return [];

  const usedAnalyzerIds = analyzerIds.filter(isString);
  const analyzerRequests = usedAnalyzerIds.map((analyzerId) =>
    listAnalyzerTargetColumns(orgId, datasetId, analyzerId, columns, options),
  );
  const responses = await Promise.allSettled(analyzerRequests);
  const monitoredColumns = responses.flatMap((p) => (p.status === 'fulfilled' ? p.value : []));
  return [...new Set(monitoredColumns)];
};

export const listMonitorTargetColumns = async (
  orgId: string,
  datasetId: string,
  monitorId: string,
  options?: CallOptions,
): Promise<string[]> => {
  const data = await getSchemaForResource(orgId, datasetId, options);
  const { columns } = data?.entitySchema ?? {};
  if (!columns?.length) return [];
  return filterColumnsByMonitorTarget(orgId, datasetId, monitorId, columns, options);
};

export const listAnalyzerTargetColumns = async (
  orgId: string,
  datasetId: string,
  analyzerId: string,
  resourceColumns: ColumnSchema[],
  options?: CallOptions,
): Promise<string[]> => {
  const analyzer = await getAnalyzer(orgId, datasetId, analyzerId, options);
  const parsedAnalyzer = translateJsonObject(analyzer) ?? {};
  const targetMatrix = translateJsonObject(parsedAnalyzer.targetMatrix);
  const { type, include, exclude } = targetMatrix ?? {};
  if (type !== 'dataset' && type !== 'column') return [];
  if (type === 'dataset') return resourceColumns.map((c) => c.column);
  const includeArray = Array.isArray(include) ? include : [];
  const excludeArray = Array.isArray(exclude) ? exclude : [];

  return filterColumnsByTargetMatrix(resourceColumns, includeArray, excludeArray);
};

export const listColumnActiveMonitors = async (
  orgId: string,
  datasetId: string,
  columnId: string,
  segments: SegmentTag[] = [],
  options?: CallOptions,
): Promise<Array<string>> => {
  const monitorConfig = await getMonitorConfigV3(orgId, datasetId, true, false, options);
  const columnSchema = monitorConfig?.entitySchema?.columns?.[columnId];
  if (!columnSchema) return [];
  const translatedColumnSchema: ColumnSchema = {
    column: columnId,
    tags: columnSchema.tags ?? undefined,
    dataType: columnSchema.dataType,
    classifier: columnSchema.classifier ?? 'input',
    discreteness: columnSchema.discreteness === 'continuous' ? DiscretenessType.Continuous : DiscretenessType.Discrete,
  };
  const analyzers = filterAnalyzerBySegments(monitorConfig?.analyzers ?? [], segments);
  const filteredAnalyzerIds = filterAnalyzersByColumn(translatedColumnSchema, analyzers);
  const monitorIds = new Set<string>();
  monitorConfig?.monitors?.forEach((m) => {
    if (m.disabled || !m.id) return;
    const isActiveMonitor = !!m.analyzerIds.find((analyzerId) => filteredAnalyzerIds.includes(analyzerId));
    if (isActiveMonitor) {
      monitorIds.add(m.id);
    }
  });

  return [...monitorIds];
};

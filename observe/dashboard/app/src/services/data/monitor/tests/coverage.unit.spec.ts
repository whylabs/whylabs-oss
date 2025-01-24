import { expect } from 'chai';

import { AlertCategory, MonitorCoverage } from '../../../../graphql/generated/graphql';
import { DataServiceAnalysisMetric } from '../../data-service/data-service-types';
import {
  DatasetMonitorCoverage,
  PartialMonitorConfig,
  calculateMonitorCoverageForOrg,
  getCoveredCategories,
} from '../coverage';

const metricsToConfig = (metrics: DataServiceAnalysisMetric[]): Required<PartialMonitorConfig> => ({
  // @ts-expect-error - we don't need to provide all the fields for test purposes
  analyzers: metrics.map((metric) => ({
    config: {
      metric,
    },
  })),
});

const expectCoveredCategories = (
  metrics: DataServiceAnalysisMetric[],
  expected: AlertCategory[],
  disabledAnalyzerIdx?: number,
): void => {
  const config = metricsToConfig(metrics);

  if (disabledAnalyzerIdx !== undefined) {
    config.analyzers[disabledAnalyzerIdx].disabled = true;
  }

  const actual = getCoveredCategories(config);
  expect(actual).to.deep.eq(expected);
};

describe('coverage', function () {
  describe('getCoveredCategories', function () {
    it('should return the categories covered by a monitor config', function () {
      expectCoveredCategories(['classification.recall'], [AlertCategory.Performance]);
    });

    it('should return the categories covered by a monitor config with multiple metrics', function () {
      expectCoveredCategories(['classification.recall', 'classification.precision'], [AlertCategory.Performance]);
    });

    it('should return the categories covered by a monitor config with multiple metrics and categories', function () {
      expectCoveredCategories(
        ['classification.recall', 'classification.precision', 'count'],
        [AlertCategory.Performance, AlertCategory.DataQuality],
      );
    });

    it('should ignore disabled analyzers', function () {
      expectCoveredCategories(
        ['classification.recall', 'classification.precision', 'count'],
        [AlertCategory.Performance],
        2,
      );
    });
  });

  describe('calculateMonitorCoverageForOrg', function () {
    it('should return the coverage for an org', function () {
      const datasetCoverages = [
        {
          datasetId: 'dataset1',
          coveredCategories: [AlertCategory.Performance],
        },
        {
          datasetId: 'dataset2',
          coveredCategories: [AlertCategory.Performance, AlertCategory.DataQuality],
        },
      ];
      const totalDatasetCount = 2;

      const expected: MonitorCoverage[] = [
        {
          category: AlertCategory.Performance,
          coveredDatasets: ['dataset1', 'dataset2'],
          coverage: 1,
        },
        {
          category: AlertCategory.DataQuality,
          coveredDatasets: ['dataset2'],
          coverage: 0.5,
        },
      ];
      const actual = calculateMonitorCoverageForOrg(datasetCoverages, totalDatasetCount);

      expect(actual).to.deep.eq(expected);
    });

    it('should return the coverage for an org with no datasets', function () {
      const datasetCoverages: DatasetMonitorCoverage[] = [];
      const totalDatasetCount = 0;

      const expected: MonitorCoverage[] = [];
      const actual = calculateMonitorCoverageForOrg(datasetCoverages, totalDatasetCount);

      expect(actual).to.deep.eq(expected);
    });

    it('should correctly calculate the coverage for orgs with more datasets than those being monitored', function () {
      const datasetCoverages = [
        {
          datasetId: 'dataset1',
          coveredCategories: [AlertCategory.Performance],
        },
        {
          datasetId: 'dataset2',
          coveredCategories: [AlertCategory.Performance, AlertCategory.DataQuality],
        },
      ];
      const totalDatasetCount = 10;

      const expected: MonitorCoverage[] = [
        {
          category: AlertCategory.Performance,
          coveredDatasets: ['dataset1', 'dataset2'],
          coverage: 0.2,
        },
        {
          category: AlertCategory.DataQuality,
          coveredDatasets: ['dataset2'],
          coverage: 0.1,
        },
      ];
      const actual = calculateMonitorCoverageForOrg(datasetCoverages, totalDatasetCount);

      expect(actual).to.deep.eq(expected);
    });
  });
});

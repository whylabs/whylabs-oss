import { expect } from 'chai';

import { AlertCategory, AnalysisMetric } from '../../../../graphql/generated/graphql';
import { OperationContext } from '../../../../util/misc';
import { AnomalyCountSchema, anomalyCountToGQL, countsByFieldByDatasetByFeature } from './anomaly-counts';

const mockContext: OperationContext = { dataType: 'anomaly', orgId: 'testOrg' };
const mockAnomaly = (
  datasetId = 'testDataset',
  timestamp = 1,
  count = 1,
  metric = AnalysisMetric.FrequentItems,
  category = AlertCategory.DataDrift,
  column = 'desc',
): AnomalyCountSchema => ({
  datasetId,
  timestamp,
  count,
  metric,
  category,
  column,
});

describe('Test anomaly count datasource helpers', function () {
  describe('Test anomalyCountToGQL', function () {
    it('should parse empty anomalies', function () {
      const actual = anomalyCountToGQL([], mockContext);
      expect(actual).to.eql([] as AnomalyCountSchema[]);
    });
    it('should map anomaly fields', function () {
      const actual = anomalyCountToGQL(
        [
          {
            datasetId: 'testId',
            metric: 'frequent_items',
            column: 'desc',
            anomalyCount: 2,
            __time: 1651363200000,
          },
        ],
        mockContext,
      );
      const expected: AnomalyCountSchema = {
        datasetId: 'testId',
        timestamp: 1651363200000,
        metric: AnalysisMetric.FrequentItems,
        count: 2,
        column: 'desc',
        category: AlertCategory.DataDrift,
      };
      expect(actual).to.eql([expected]);
    });
    it('should tolerate NaNs', function () {
      const actual = anomalyCountToGQL(
        [
          {
            datasetId: 'testId',
            metric: undefined,
            column: undefined,
            anomalyCount: 'NaN',
            __time: 'NaN',
          },
        ],
        mockContext,
      );
      const expected: AnomalyCountSchema = {
        datasetId: 'testId',
        timestamp: 0,
        metric: AnalysisMetric.Composed,
        count: 0,
        column: '',
        category: AlertCategory.DataQuality,
      };
      expect(actual).to.eql([expected]);
    });
  });

  describe('Test countsByFieldByFeature', function () {
    it('should aggregate empty array', function () {
      const actual = countsByFieldByDatasetByFeature(new Set(), new Set(), [], 'metric');
      expect(actual).to.eql(new Map());
    });

    it('should aggregate counts by metric', function () {
      const anomaly1 = mockAnomaly();
      const anomaly2 = mockAnomaly(
        'testDataset',
        1,
        3,
        AnalysisMetric.ClassificationPrecision,
        AlertCategory.Performance,
      );
      const actual = countsByFieldByDatasetByFeature(
        new Set(['testDataset']),
        new Set(['desc']),
        [anomaly1, anomaly1, anomaly2],
        'metric',
      );
      const expectedCount1 = { category: AlertCategory.DataDrift, metric: AnalysisMetric.FrequentItems, count: 2 };
      const expectedCount2 = {
        category: AlertCategory.Performance,
        metric: AnalysisMetric.ClassificationPrecision,
        count: 3,
      };
      const expectedFeatureMap = new Map([
        ['desc', { totals: [], timeseries: [{ timestamp: 1, counts: [expectedCount1, expectedCount2] }] }],
      ]);

      const expected = new Map([['testDataset', expectedFeatureMap]]);

      expect(actual).to.eql(expected);
    });

    it('should aggregate counts by category', function () {
      const anomaly1 = mockAnomaly();
      const anomaly2 = mockAnomaly(
        'testDataset',
        1,
        3,
        AnalysisMetric.ClassificationPrecision,
        AlertCategory.Performance,
      );
      const actual = countsByFieldByDatasetByFeature(
        new Set(['testDataset']),
        new Set(['desc']),
        [anomaly1, anomaly1, anomaly2],
        'category',
      );
      const expectedCount1 = { category: AlertCategory.DataDrift, count: 2 };
      const expectedCount2 = {
        category: AlertCategory.Performance,
        count: 3,
      };
      const expectedFeatureMap = new Map([
        ['desc', { totals: [], timeseries: [{ timestamp: 1, counts: [expectedCount1, expectedCount2] }] }],
      ]);

      const expected = new Map([['testDataset', expectedFeatureMap]]);

      expect(actual).to.eql(expected);
    });

    it('should aggregate counts across features and timestamps', function () {
      const anomaly1 = mockAnomaly();
      const anomaly2 = mockAnomaly('testDataset', 2);
      const anomaly3 = mockAnomaly('testDataset', 2, 3, AnalysisMetric.Histogram, AlertCategory.DataDrift, 'other');
      const actual = countsByFieldByDatasetByFeature(
        new Set(['testDataset']),
        new Set(['desc', 'other']),
        [anomaly1, anomaly2, anomaly3],
        'category',
      );
      const expectedCount1 = { category: AlertCategory.DataDrift, count: 1 };
      const expectedCount3 = {
        category: AlertCategory.DataDrift,
        count: 3,
      };
      const expectedFeatureMap = new Map([
        [
          'desc',
          {
            totals: [],
            timeseries: [
              { timestamp: 1, counts: [expectedCount1] },
              { timestamp: 2, counts: [expectedCount1] },
            ],
          },
        ],
        ['other', { totals: [], timeseries: [{ timestamp: 2, counts: [expectedCount3] }] }],
      ]);

      const expected = new Map([['testDataset', expectedFeatureMap]]);

      expect(actual).to.eql(expected);
    });

    it('should aggregate counts across features when some have no results', function () {
      const anomaly1 = mockAnomaly();
      const actual = countsByFieldByDatasetByFeature(
        new Set(['testDataset']),
        new Set(['desc', 'other']),
        [anomaly1],
        'category',
      );
      const expectedCount1 = { category: AlertCategory.DataDrift, count: 1 };
      const expectedFeatureMap = new Map([
        [
          'desc',
          {
            totals: [],
            timeseries: [{ timestamp: 1, counts: [expectedCount1] }],
          },
        ],
        ['other', { totals: [], timeseries: [] }],
      ]);
      const expected = new Map([['testDataset', expectedFeatureMap]]);
      expect(actual).to.eql(expected);
    });

    it('should aggregate counts across all features when required is null', function () {
      const anomaly1 = mockAnomaly();
      const actual = countsByFieldByDatasetByFeature(
        new Set(['testDataset']),
        new Set([null]),
        [anomaly1, anomaly1],
        'category',
      );
      const expectedCount = { category: AlertCategory.DataDrift, count: 2 };
      const expectedFeatureMap = new Map([
        [
          null,
          {
            totals: [],
            timeseries: [{ timestamp: 1, counts: [expectedCount] }],
          },
        ],
      ]);
      const expected = new Map([['testDataset', expectedFeatureMap]]);
      expect(actual).to.eql(expected);
    });

    it('should aggregate counts across multiple datasets and features', function () {
      const anomaly1 = mockAnomaly('dataset1');
      const anomaly2 = mockAnomaly('dataset2');

      const actual = countsByFieldByDatasetByFeature(
        new Set(['dataset1', 'dataset2']),
        new Set(['desc']),
        [anomaly1, anomaly2, anomaly2],
        'category',
      );
      const expectedCount1 = { category: AlertCategory.DataDrift, count: 1 };
      const expectedCount2 = { category: AlertCategory.DataDrift, count: 2 };

      const expectedFeatureMap1 = new Map([
        [
          'desc',
          {
            totals: [],
            timeseries: [{ timestamp: 1, counts: [expectedCount1] }],
          },
        ],
      ]);

      const expectedFeatureMap2 = new Map([
        [
          'desc',
          {
            totals: [],
            timeseries: [{ timestamp: 1, counts: [expectedCount2] }],
          },
        ],
      ]);
      const expected = new Map([
        ['dataset1', expectedFeatureMap1],
        ['dataset2', expectedFeatureMap2],
      ]);
      expect(actual).to.eql(expected);
    });
  });
});

import { expect } from 'chai';

import { AnalysisMetric, MetricQuery } from '../../generated/graphql';
import { numericMetricsToGql } from './numeric-metrics-converter';

const sampleRollups = [
  {
    datasetId: 'm1',
    timestamp: 100,
    features: {
      f1: {
        type_double: {
          count_null_ratio: 0.1,
          count_null: 2,
        },
        type_long: {
          'whylabs/last_upload_ts': 55,
        },
      },
      f2: {
        type_double: {
          count_null: 5,
        },
        type_long: {
          'whylabs/last_upload_ts': 56,
        },
      },
    },
  },
  {
    datasetId: 'm1',
    timestamp: 300,
    features: {
      f1: {
        type_double: {
          count_null_ratio: 0.3,
        },
        type_long: {
          'whylabs/last_upload_ts': 55,
        },
      },
      '': {
        type_double: {
          classification_precision: 0.5,
        },
        type_long: {
          'whylabs/last_upload_ts': 55,
        },
      },
    },
  },
  {
    datasetId: 'm1',
    timestamp: 200,
    features: {
      f1: {
        type_double: {
          count_null_ratio: 0.2,
        },
      },
    },
  },
  {
    datasetId: 'd2',
    timestamp: 200,
    features: {
      f1: {
        type_double: {
          count_null: 1,
        },
        type_long: {
          'whylabs/last_upload_ts': 55,
        },
      },
    },
  },
];

describe('Convert numeric metrics', function () {
  describe('test numericMetricsToGql', function () {
    it('should return empty points if no matching feature', function () {
      const query: MetricQuery = { datasetId: 'm1', metric: AnalysisMetric.CountNull, feature: 'f3' };
      const expected = [{ ...query, points: [], segment: [] }];
      expect(numericMetricsToGql([query], sampleRollups)).to.deep.eq(expected);
    });

    it('should return empty points if no matching metric', function () {
      const query: MetricQuery = { datasetId: 'm1', metric: AnalysisMetric.CountBool, feature: 'f1' };
      const expected = [{ ...query, points: [], segment: [] }];
      expect(numericMetricsToGql([query], sampleRollups)).to.deep.eq(expected);
    });

    it('should return a performance metric', function () {
      const query: MetricQuery = { datasetId: 'm1', metric: AnalysisMetric.ClassificationPrecision };
      const expected = [
        {
          ...query,
          feature: '__internal__.datasetMetrics',
          points: [{ timestamp: 300, value: 0.5, lastUploadTimestamp: 55 }],
          segment: [],
        },
      ];
      expect(numericMetricsToGql([query], sampleRollups)).to.deep.eq(expected);
    });
    it('should return a performance metric with tags', function () {
      const query: MetricQuery = { datasetId: 'm1', metric: AnalysisMetric.ClassificationPrecision };
      const expected = [
        {
          ...query,
          feature: '__internal__.datasetMetrics',
          points: [{ timestamp: 300, value: 0.5, lastUploadTimestamp: 55 }],
          segment: [{ key: 'test', value: 'foo' }],
        },
      ];
      expect(numericMetricsToGql([query], sampleRollups, [{ key: 'test', value: 'foo' }])).to.deep.eq(expected);
    });

    it('should return a column metric', function () {
      const query: MetricQuery = { datasetId: 'm1', feature: 'f2', metric: AnalysisMetric.CountNull };
      const expected = [
        { ...query, feature: 'f2', points: [{ timestamp: 100, value: 5, lastUploadTimestamp: 56 }], segment: [] },
      ];
      expect(numericMetricsToGql([query], sampleRollups)).to.deep.eq(expected);
    });

    it('should return a list of points for one metric in increasing timestamp order', function () {
      const query: MetricQuery = { datasetId: 'm1', feature: 'f1', metric: AnalysisMetric.CountNullRatio };
      const expected = [
        {
          ...query,
          feature: 'f1',
          points: [
            { timestamp: 100, value: 0.1, lastUploadTimestamp: 55 },
            { timestamp: 200, value: 0.2, lastUploadTimestamp: undefined },
            { timestamp: 300, value: 0.3, lastUploadTimestamp: 55 },
          ],
          segment: [],
        },
      ];
      expect(numericMetricsToGql([query], sampleRollups)).to.deep.eq(expected);
    });
  });
});

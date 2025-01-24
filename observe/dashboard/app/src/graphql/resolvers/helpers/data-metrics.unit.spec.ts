import { expect } from 'chai';
import { uniq } from 'ramda';

import { PERFORMANCE_TAG, QUALITY_TAG } from '../../../constants';
import { AnalysisMetric, MetricDirection, MetricKind } from '../../generated/graphql';
import { standardMetricsSchemas } from './data-metrics';

const perfMetrics = standardMetricsSchemas.filter((m) => m.tags?.includes(PERFORMANCE_TAG));
const dataQualityMetrics = standardMetricsSchemas.filter((m) => m.tags?.includes(QUALITY_TAG));

describe('standardMetricsSchemas', function () {
  describe('Test performance metric schemas', function () {
    it('should have a direction for metrics other than prediction count', function () {
      const hasDirectionOrCount = perfMetrics.filter(
        (m) => m.metricDirection || m.name === AnalysisMetric.PredictionCount,
      );
      expect(hasDirectionOrCount.length).to.equal(perfMetrics.length);
    });
    it('should have a kind of rate for metrics other than prediction count', function () {
      expect(
        perfMetrics.filter((m) => m.metricKind === MetricKind.Rate || m.name === AnalysisMetric.PredictionCount).length,
      ).to.equal(perfMetrics.length);
    });
    it('should have a kind of amount for prediction count', function () {
      const predictionCountInfo = perfMetrics.find((m) => m.name === AnalysisMetric.PredictionCount);
      expect(predictionCountInfo?.metricKind).to.equal(MetricKind.Amount);
      expect(predictionCountInfo?.metricDirection).to.be.undefined;
    });
  });
  describe('Test data quality metric schemas', function () {
    it('should have a direction for null metrics', function () {
      const nullMetrics = [AnalysisMetric.CountNull, AnalysisMetric.CountNullRatio];
      const shouldImproveDown = dataQualityMetrics.filter((m) => nullMetrics.includes(m.name));
      expect(uniq(shouldImproveDown.map((m) => m.metricDirection))).to.eql([MetricDirection.ImproveDown]);
    });
  });
});

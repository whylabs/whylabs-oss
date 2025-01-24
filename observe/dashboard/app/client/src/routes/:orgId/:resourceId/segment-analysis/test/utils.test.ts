import {
  ResourceMetricsData,
  TracingPreset,
  findMetricByLabel,
  findPresetForResourceType,
  generateMetricGraphTickPositions,
} from '~/routes/:orgId/:resourceId/segment-analysis/utils';
import {
  AnalysisMetric,
  AnalysisTargetLevel,
  MetricDataType,
  MetricDirection,
  MetricKind,
  MetricSource,
  ModelType,
} from '~server/graphql/generated/graphql';

const MOCKED_RANKING_MODEL_METRICS: ResourceMetricsData = [
  {
    source: MetricSource.UserDefined,
    dataType: MetricDataType.Float,
    unitInterval: false,
    showAsPercent: false,
    metricKind: MetricKind.Amount,
    name: AnalysisMetric.Mean,
    label: 'average_precision_k_3',
    tags: ['performance'],
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column,
      column: 'average_precision_k_3',
      metric: AnalysisMetric.Mean,
      metricLabel: 'Mean',
    },
  },
  {
    source: MetricSource.UserDefined,
    dataType: MetricDataType.Float,
    unitInterval: false,
    showAsPercent: false,
    metricKind: MetricKind.Amount,
    name: AnalysisMetric.Mean,
    label: 'average_precision',
    tags: ['performance'],
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column,
      column: 'average_precision',
      metric: AnalysisMetric.Mean,
      metricLabel: 'Mean',
    },
  },
  // has no reciprocal_rank to test unavailable metric for Bias preset
  {
    source: MetricSource.UserDefined,
    dataType: MetricDataType.Float,
    unitInterval: false,
    showAsPercent: false,
    metricKind: MetricKind.Amount,
    name: AnalysisMetric.Mean,
    label: 'top_rank',
    tags: ['performance'],
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column,
      column: 'top_rank',
      metric: AnalysisMetric.Mean,
      metricLabel: 'Mean',
    },
  },
  {
    source: MetricSource.Whylabs,
    dataType: MetricDataType.Integer,
    unitInterval: false,
    showAsPercent: false,
    metricKind: MetricKind.Amount,
    name: AnalysisMetric.Count,
    label: 'Total count',
    tags: ['quality'],
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column,
      metric: AnalysisMetric.Count,
      metricLabel: 'Total count',
    },
  },
  {
    source: MetricSource.Whylabs,
    dataType: MetricDataType.Float,
    unitInterval: true,
    showAsPercent: false,
    metricKind: MetricKind.Rate,
    name: AnalysisMetric.CountNullRatio,
    label: 'Null ratio',
    metricDirection: MetricDirection.ImproveDown,
    tags: ['quality'],
    queryDefinition: {
      targetLevel: AnalysisTargetLevel.Column,
      metric: AnalysisMetric.CountNullRatio,
      metricLabel: 'Null ratio',
    },
  },
];

describe('Segment analysis utils', () => {
  it.each([
    { min: 1, max: 2, integerDataType: true, expected: [0, 1, 2, 3], isUnitInterval: false },
    { min: 0, max: 10, integerDataType: true, expected: [0, 4, 8, 12], isUnitInterval: false },
    { min: 0, max: 0.33, integerDataType: false, expected: [0, 1 / 3, 2 / 3, 1], isUnitInterval: true },
  ])(
    'should generateMetricGraphTickPositions for params %#',
    ({ min, max, integerDataType, isUnitInterval, expected }) => {
      const ticks = generateMetricGraphTickPositions({
        dataMin: min,
        dataMax: max,
        ticksAmount: 4,
        integerDataType,
        isUnitInterval,
      });
      expect(ticks).toStrictEqual(expected);
    },
  );

  it('testing generateMetricGraphTickPositions with buffer', () => {
    const ticks = generateMetricGraphTickPositions({
      dataMin: 0,
      dataMax: 100,
      ticksAmount: 4,
      integerDataType: false,
      isUnitInterval: false,
    });
    expect(ticks).toStrictEqual([0, 35, 70, 105]);
  });

  it('should find the first (alphabetically sorted by label ASC) metric that matches the "average_precision" prefix', () => {
    const result = findMetricByLabel(MOCKED_RANKING_MODEL_METRICS, 'average_precision*');
    expect(result).toStrictEqual(MOCKED_RANKING_MODEL_METRICS[1]);
  });

  it('should find the first (alphabetically sorted by label ASC) metric with "Total count" label', () => {
    const result = findMetricByLabel(MOCKED_RANKING_MODEL_METRICS, 'Total count');
    expect(result).toStrictEqual(MOCKED_RANKING_MODEL_METRICS[3]);
  });

  it('should find available DataQuality preset', () => {
    const preset = findPresetForResourceType(
      TracingPreset.dataQuality,
      ModelType.Ranking,
      MOCKED_RANKING_MODEL_METRICS,
    );
    expect(preset).toBe(TracingPreset.dataQuality);
  });

  it('should not find unavailable Bias preset', () => {
    const preset = findPresetForResourceType(
      TracingPreset.biasAndFairness,
      ModelType.Ranking,
      MOCKED_RANKING_MODEL_METRICS,
    );
    expect(preset).toBeNull();
  });

  it('should find first available preset', () => {
    const preset = findPresetForResourceType(null, ModelType.Ranking, MOCKED_RANKING_MODEL_METRICS);
    expect(preset).toBe(TracingPreset.performance);
  });
});

import { GraphQLResolveInfo } from 'graphql';
import { parse } from 'graphql-parse-resolve-info';
import { difference, uniq } from 'lodash';
import { find, propEq } from 'ramda';

import { PERFORMANCE_TAG, QUALITY_TAG } from '../../../constants';
import { DerivedMetric } from '../../../services/data/data-service/data-service-types';
import { notNullish } from '../../../util/misc';
import { KnownProfileMetric } from '../../contract-converters/data-service/profile-converter';
import {
  AnalysisMetric,
  AnalysisTargetLevel,
  MetricBounds,
  MetricDataType,
  MetricDirection,
  MetricKind,
  MetricSchema,
  MetricSource,
  ModelType,
} from '../../generated/graphql';

type BuiltinMetricSchema = MetricSchema & { name: AnalysisMetric };

const countMetrics = [
  { name: AnalysisMetric.CountNull, label: 'Null count', metricDirection: MetricDirection.ImproveDown },
  { name: AnalysisMetric.Count, label: 'Total count' },
  { name: AnalysisMetric.CountBool, label: 'Boolean count' },
  { name: AnalysisMetric.CountIntegral, label: 'Integer count' },
  { name: AnalysisMetric.CountString, label: 'Text count' },
  { name: AnalysisMetric.CountFractional, label: 'Fraction count' },
  { name: AnalysisMetric.UniqueEst, label: 'Est. unique count' },
];
const ratioMetrics = [
  { name: AnalysisMetric.UniqueEstRatio, label: 'Est. unique ratio', unitInterval: false },
  { name: AnalysisMetric.CountNullRatio, label: 'Null ratio', metricDirection: MetricDirection.ImproveDown },
];

const numericValueMetrics = [
  { name: AnalysisMetric.Min, label: 'Minimum value', quantile: 0.0 },
  { name: AnalysisMetric.Quantile_5, label: '5th percentile', quantile: 0.05 },
  { name: AnalysisMetric.Quantile_25, label: '25th percentile', quantile: 0.25 },
  { name: AnalysisMetric.Median, label: 'Median value', quantile: 0.5 },
  { name: AnalysisMetric.Quantile_75, label: '75th percentile', quantile: 0.75 },
  { name: AnalysisMetric.Quantile_95, label: '95th percentile', quantile: 0.95 },
  { name: AnalysisMetric.Quantile_99, label: '99th percentile', quantile: 0.99 },
  { name: AnalysisMetric.Max, label: 'Maximum value', quantile: 1.0 },
  { name: AnalysisMetric.StdDev, label: 'Standard deviation' },
  { name: AnalysisMetric.Mean, label: 'Mean' },
  { name: AnalysisMetric.UniqueLower, label: 'Unique count lower bound' },
  { name: AnalysisMetric.UniqueUpper, label: 'Unique count upper bound' },
];

const performanceRateMetrics = [
  { name: AnalysisMetric.ClassificationAccuracy, label: 'Accuracy', metricDirection: MetricDirection.ImproveUp },
  { name: AnalysisMetric.ClassificationPrecision, label: 'Precision', metricDirection: MetricDirection.ImproveUp },
  { name: AnalysisMetric.ClassificationRecall, label: 'Recall', metricDirection: MetricDirection.ImproveUp },
  { name: AnalysisMetric.ClassificationF1, label: 'F1', metricDirection: MetricDirection.ImproveUp },
  {
    name: AnalysisMetric.ClassificationFpr,
    label: 'False positive rate',
    metricDirection: MetricDirection.ImproveDown,
  },
  {
    name: AnalysisMetric.ClassificationAuroc,
    label: 'Area under ROC (AUC-ROC)',
    metricDirection: MetricDirection.ImproveUp,
  },
  // { name: AnalysisMetric.ClassificationAupr, label: 'Area under precision-recall (AUC-PR)', metricDirection: MetricDirection.ImproveUp },
];

const performanceCountMetrics = [{ name: AnalysisMetric.PredictionCount, label: 'Prediction count' }];

const performanceErrorRateMetrics = [
  {
    name: AnalysisMetric.RegressionMae,
    label: 'Mean absolute error (MAE)',
    metricDirection: MetricDirection.ImproveDown,
  },
  {
    name: AnalysisMetric.RegressionMse,
    label: 'Mean squared error (MSE)',
    metricDirection: MetricDirection.ImproveDown,
  },
  {
    name: AnalysisMetric.RegressionRmse,
    label: 'Root mean square error (RMSE)',
    metricDirection: MetricDirection.ImproveDown,
  },
];
export const CLASSIFICATION_METRICS = performanceRateMetrics.map((m) => m.name);
export const REGRESSION_METRICS = performanceErrorRateMetrics.map((m) => m.name);

const boundedMetrics: { [key in AnalysisMetric]?: MetricBounds } = {
  [AnalysisMetric.UniqueEst]: { lower: AnalysisMetric.UniqueLower, upper: AnalysisMetric.UniqueUpper },
};

const getBounds = (name: AnalysisMetric) => (name in boundedMetrics ? boundedMetrics[name] : undefined);

const setDefaultMetadata = (metric: { name: AnalysisMetric; label: string }): BuiltinMetricSchema => ({
  source: MetricSource.Whylabs,
  dataType: MetricDataType.Float,
  unitInterval: false,
  showAsPercent: false,
  metricKind: MetricKind.Amount,
  // metricName: analysisMetricToDataService(metric.name),
  ...metric,
  bounds: getBounds(metric.name),
});

const getDefaultColumnMetricQueryDefinition = (
  metric: AnalysisMetric,
  metricLabel: string,
): MetricSchema['queryDefinition'] => ({
  targetLevel: AnalysisTargetLevel.Column,
  metric,
  metricLabel,
});

const getDefaultDatasetMetricColumnDefinition = (
  metric: AnalysisMetric,
  metricLabel: string,
): MetricSchema['queryDefinition'] => ({
  targetLevel: AnalysisTargetLevel.Dataset,
  metric,
  metricLabel,
});

// This only covers the numeric column metrics
export const standardMetricsSchemas: BuiltinMetricSchema[] = [
  countMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [QUALITY_TAG],
    dataType: MetricDataType.Integer,
    queryDefinition: getDefaultColumnMetricQueryDefinition(m.name, m.label),
  })),
  numericValueMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [QUALITY_TAG],
    queryDefinition: getDefaultColumnMetricQueryDefinition(m.name, m.label),
  })),
  ratioMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [QUALITY_TAG],
    unitInterval: m.unitInterval ?? true,
    metricKind: MetricKind.Rate,
    queryDefinition: getDefaultColumnMetricQueryDefinition(m.name, m.label),
  })),
  performanceRateMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [PERFORMANCE_TAG],
    unitInterval: true,
    showAsPercent: true,
    metricKind: MetricKind.Rate,
    queryDefinition: getDefaultDatasetMetricColumnDefinition(m.name, m.label),
  })),
  performanceErrorRateMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [PERFORMANCE_TAG],
    metricKind: MetricKind.Rate,
    queryDefinition: getDefaultDatasetMetricColumnDefinition(m.name, m.label),
  })),
  performanceCountMetrics.map((m) => ({
    ...setDefaultMetadata(m),
    tags: [PERFORMANCE_TAG],
    dataType: MetricDataType.Integer,
    queryDefinition: getDefaultDatasetMetricColumnDefinition(m.name, m.label),
  })),
].flat();

export const additionalMetricsSchemas: BuiltinMetricSchema[] = [
  {
    ...setDefaultMetadata({ name: AnalysisMetric.FrequentItems, label: 'Frequent items distribution' }),
    tags: ['quality'],
    dataType: MetricDataType.Complex,
    metricKind: MetricKind.Distribution,
    queryDefinition: getDefaultColumnMetricQueryDefinition(AnalysisMetric.FrequentItems, 'Frequent items distribution'),
  },
];

export const findMetricMetadata = (name: AnalysisMetric): BuiltinMetricSchema | null => {
  return (
    find<BuiltinMetricSchema>(propEq('name', name), standardMetricsSchemas) ??
    find<BuiltinMetricSchema>(propEq('name', name), additionalMetricsSchemas) ??
    null
  );
};

const mapDerivedToAnalysisMetric = new Map<DerivedMetric, AnalysisMetric>([
  ['recall', AnalysisMetric.ClassificationRecall],
  ['accuracy', AnalysisMetric.ClassificationAccuracy],
  ['f1', AnalysisMetric.ClassificationF1],
  ['fpr', AnalysisMetric.ClassificationFpr],
  ['precision', AnalysisMetric.ClassificationPrecision],
  ['macroAuc', AnalysisMetric.ClassificationAuroc],
  // ['aupr', AnalysisMetric.ClassificationAupr],
  ['mean_squared_error', AnalysisMetric.RegressionMse],
  ['mean_absolute_error', AnalysisMetric.RegressionMae],
  ['root_mean_squared_error', AnalysisMetric.RegressionRmse],
  ['count', AnalysisMetric.PredictionCount],
]);

export const findPerformanceMetricMetadata = (name: DerivedMetric): MetricSchema | null => {
  const analysisMetric = mapDerivedToAnalysisMetric.get(name);
  return analysisMetric ? findMetricMetadata(analysisMetric) : null;
};

/**
 * Given the info for a graphql operation returning a feature sketch, get the list of requested fields
 * @param info Resolver info
 */
const getRequestedSketchFields = (info: GraphQLResolveInfo): string[] => {
  const resolved = parse(info);
  if (!resolved) return [];

  // we're looking specifically for FeatureSketch fields within the queries
  const sketchFields = resolved.fieldsByTypeName['FeatureSketch'];
  const fieldNames = Object.values(sketchFields).map((f) => f.name);
  if ('numberSummary' in sketchFields) {
    Object.values(sketchFields['numberSummary'].fieldsByTypeName['NumberSummary']).forEach((f) => {
      fieldNames.push(`numberSummary.${f.name}`);
    });
  }
  if ('schemaSummary' in sketchFields) {
    Object.values(sketchFields['schemaSummary'].fieldsByTypeName['SchemaSummary']).forEach((f) => {
      fieldNames.push(`schemaSummary.${f.name}`);
    });
  }
  return fieldNames;
};

const sketchFieldToMetricMap = new Map<string, KnownProfileMetric[]>([
  ['totalCount', ['counts/n']],
  ['nullCount', ['counts/null']],
  ['nullRatio', ['counts/null', 'counts/n']],
  ['booleanCount', ['types/boolean']],
  ['integerCount', ['types/integral']],
  ['fractionCount', ['types/fractional']],
  ['showAsDiscrete', ['distribution/isdiscrete']],
  ['uniqueCount', ['cardinality/est', 'cardinality/lower_1', 'cardinality/upper_1']],
  ['uniqueRatio', ['cardinality/est', 'counts/n']],
  ['frequentItems', ['frequent_items/frequent_strings']],
  [
    'schemaSummary.inference',
    [
      'inferredtype/type',
      'inferredtype/ratio',
      'types/object',
      'counts/null',
      'types/fractional',
      'types/integral',
      'types/boolean',
      'types/string',
      'counts/n',
    ],
  ],
  [
    'schemaSummary.typeCounts',
    ['types/object', 'counts/null', 'types/fractional', 'types/integral', 'types/boolean', 'types/string'],
  ],
  ['numberSummary.histogram', ['distribution/kll/histogram']],
  ['numberSummary.count', ['distribution/kll/n']],
  ['numberSummary.min', ['distribution/kll/min']],
  ['numberSummary.max', ['distribution/kll/max']],
  ['numberSummary.mean', ['distribution/mean']],
  ['numberSummary.stddev', ['distribution/stddev']],
  ['numberSummary.quantiles', ['distribution/kll/quantiles']],
  ['numberSummary.isDiscrete', ['distribution/isdiscrete']],
]);

export const extractRequiredMetrics = (info: GraphQLResolveInfo): string[] => {
  const fields = getRequestedSketchFields(info);
  return uniq(fields.flatMap((f) => sketchFieldToMetricMap.get(f)).filter(notNullish));
};

export const getBuiltInMetrics = (modelType?: ModelType): BuiltinMetricSchema[] => {
  const metrics: BuiltinMetricSchema[] = [...standardMetricsSchemas];
  if (!modelType) return metrics;

  // remove metrics that don't match the model type
  const omitMetrics: AnalysisMetric[] = [];
  if (modelType !== ModelType.Classification) {
    omitMetrics.push(...CLASSIFICATION_METRICS);
  }
  if (modelType !== ModelType.Regression) {
    omitMetrics.push(...REGRESSION_METRICS);
  }
  if (modelType !== ModelType.Regression && modelType !== ModelType.Classification) {
    omitMetrics.push(AnalysisMetric.PredictionCount);
  }
  return metrics.filter((m) => !omitMetrics.includes(m.name));
};

export const filterMetricsByTags = (metrics: MetricSchema[], metricTags: string[]): MetricSchema[] =>
  metrics.filter((s) => difference(metricTags ?? [], s.tags ?? []).length === 0);

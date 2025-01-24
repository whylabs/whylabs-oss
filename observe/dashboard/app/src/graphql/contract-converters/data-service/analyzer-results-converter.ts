import {
  AnalyzerResultResponse,
  ColumnListChangeContainer,
  ComparisonContainer,
  DiffContainer,
  DriftContainer,
  FrequentStringComparisonContainer,
  SeasonalContainer,
  TargetLevel,
  ThresholdContainer,
} from '@whylabs/data-service-node-client';

import { getLogger } from '../../../providers/logger';
import {
  DataServiceAnalysisMetric,
  DataServiceAnalysisResultType,
} from '../../../services/data/data-service/data-service-types';
import { invertMap } from '../../../util/contract-utils';
import { OperationContext, describeOperationContext } from '../../../util/misc';
import { safeParseNumber } from '../../../util/numbers';
import { segmentTextToTags } from '../../../util/tags';
import {
  AlertCategory,
  AnalysisMetric,
  AnalysisResult,
  AnalysisTargetLevel,
  Maybe,
  SegmentTag,
} from '../../generated/graphql';

const logger = getLogger('DataServiceAnalysisResultsConverter');
export const metricToGQLCategory = (
  metric: Maybe<DataServiceAnalysisMetric | string>,
  context?: OperationContext,
): AlertCategory => {
  if (metric == undefined) {
    return AlertCategory.DataQuality; // this is a composed analyzer result
  }
  if (metric == null) {
    logger.error(`Null metric name found${describeOperationContext(context)}; defaulting to unknown category`);
    return AlertCategory.Unknown;
  }
  switch (metric.toLocaleLowerCase()) {
    case 'count_null':
    case 'count_null_ratio':
    case 'unique_upper':
    case 'unique_upper_ratio':
    case 'unique_est':
    case 'unique_est_ratio':
    case 'unique_lower':
    case 'unique_lower_ratio':
    case 'count_bool':
    case 'count_bool_ratio':
    case 'count_integral':
    case 'count_integral_ratio':
    case 'count_fractional':
    case 'count_fractional_ratio':
    case 'count_string':
    case 'count_string_ratio':
    case 'input.count':
    case 'inferred_data_type':
    case 'output.count':
    case 'count':
    case 'median':
    case 'min':
    case 'max':
    case 'mean':
    case 'stddev':
    case 'variance':
    case 'quantile_75':
    case 'quantile_5':
    case 'quantile_95':
    case 'quantile_25':
    case 'quantile_90':
    case 'quantile_99':
      return AlertCategory.DataQuality;
    case 'histogram':
    case 'frequent_items':
      return AlertCategory.DataDrift;
    case 'profile.count':
    case 'profile.last_ingestion_time':
    case 'profile.first_ingestion_time':
    case 'secondsSinceLastUpload'.toLocaleLowerCase():
    case 'missingDatapoint'.toLocaleLowerCase():
      return AlertCategory.Ingestion;
    case 'classification.f1':
    case 'classification.fpr':
    case 'classification.precision':
    case 'classification.recall':
    case 'classification.accuracy':
    case 'classification.auroc':
    case 'regression.mse':
    case 'regression.mae':
    case 'regression.rmse':
      // case 'classification.aupr':
      return AlertCategory.Performance;
    case 'column_row_count_sum':
    case 'shape_column_count':
    case 'shape_row_count':
    default:
      logger.error(`Don't know how to map metric ${metric} to a category${describeOperationContext(context)}`);
      return AlertCategory.Unknown;
  }
};

export const analysisMetricMap = new Map<Maybe<DataServiceAnalysisMetric>, Maybe<AnalysisMetric>>([
  ['classification.accuracy', AnalysisMetric.ClassificationAccuracy],
  ['classification.recall', AnalysisMetric.ClassificationRecall],
  ['classification.fpr', AnalysisMetric.ClassificationFpr],
  ['classification.precision', AnalysisMetric.ClassificationPrecision],
  ['classification.f1', AnalysisMetric.ClassificationF1],
  ['classification.auroc', AnalysisMetric.ClassificationAuroc],
  ['frequent_items', AnalysisMetric.FrequentItems],
  ['histogram', AnalysisMetric.Histogram],
  // following fields are not actually implemented but are in monitor config schema, so leaving in place for now
  ['profile.count', AnalysisMetric.ProfileCount],
  ['profile.last_ingestion_time', AnalysisMetric.ProfileLastIngestionTime],
  ['profile.first_ingestion_time', AnalysisMetric.ProfileFirstIngestionTime],
  ['input.count', AnalysisMetric.InputCount],
  ['output.count', AnalysisMetric.OutputCount],
  // end not implemented
  ['classification.auroc', AnalysisMetric.ClassificationAuroc],
  // ['classification.aupr', AnalysisMetric.ClassificationAupr], // not implemented yet
  ['regression.mse', AnalysisMetric.RegressionMse],
  ['regression.mae', AnalysisMetric.RegressionMae],
  ['regression.rmse', AnalysisMetric.RegressionRmse],
  ['count', AnalysisMetric.Count],
  ['median', AnalysisMetric.Median],
  ['min', AnalysisMetric.Min],
  ['max', AnalysisMetric.Max],
  ['mean', AnalysisMetric.Mean],
  ['stddev', AnalysisMetric.StdDev],
  ['variance', AnalysisMetric.Variance],
  ['unique_upper', AnalysisMetric.UniqueUpper],
  ['unique_upper_ratio', AnalysisMetric.UniqueUpperRatio],
  ['unique_est', AnalysisMetric.UniqueEst],
  ['unique_est_ratio', AnalysisMetric.UniqueEstRatio],
  ['unique_lower', AnalysisMetric.UniqueLower],
  ['unique_lower_ratio', AnalysisMetric.UniqueLowerRatio],
  ['count_bool', AnalysisMetric.CountBool],
  ['count_bool_ratio', AnalysisMetric.CountBoolRatio],
  ['count_integral', AnalysisMetric.CountIntegral],
  ['count_integral_ratio', AnalysisMetric.CountIntegralRatio],
  ['count_fractional', AnalysisMetric.CountFractional],
  ['count_fractional_ratio', AnalysisMetric.CountFractionalRatio],
  ['count_string', AnalysisMetric.CountString],
  ['count_string_ratio', AnalysisMetric.CountStringRatio],
  ['count_null', AnalysisMetric.CountNull],
  ['count_null_ratio', AnalysisMetric.CountNullRatio],
  ['inferred_data_type', AnalysisMetric.InferredDataType],
  ['quantile_5', AnalysisMetric.Quantile_5],
  ['quantile_25', AnalysisMetric.Quantile_25],
  ['quantile_75', AnalysisMetric.Quantile_75],
  ['quantile_90', AnalysisMetric.Quantile_90],
  ['quantile_95', AnalysisMetric.Quantile_95],
  ['quantile_99', AnalysisMetric.Quantile_99],
  // following fields are not actually implemented
  ['column_row_count_sum', AnalysisMetric.ColumnRowCountSum],
  ['shape_column_count', AnalysisMetric.ShapeColumnCount],
  ['shape_row_count', AnalysisMetric.ShapeRowCount],
  // end not implemented
  ['secondsSinceLastUpload', AnalysisMetric.SecondsSinceLastUpload],
  ['missingDatapoint', AnalysisMetric.MissingDatapoint],
  ['prediction_count', AnalysisMetric.PredictionCount],
  [undefined, undefined], // it is now valid to have an undefined metric for composed analyzers
  [null, AnalysisMetric.Unknown],
]);

export const analyzerResultTypeToFields = (
  resultType: Maybe<DataServiceAnalysisResultType | string>,
): (keyof AnalysisResult)[] => {
  // Mappings here should match monitor logic: https://gitlab.com/whylabs/core/whylabs-processing-core/-/tree/mainline/murmuration/src/main/java/ai/whylabs/core/calculationsV3/results
  switch (resultType) {
    case 'DiffCalculationResult':
      return ['diff_metricValue', 'diff_threshold', 'diff_mode'];
    case 'DriftCalculationResult':
      return ['drift_metricValue', 'drift_threshold'];
    case 'EqualityCalculationResult':
      return ['comparison_observed', 'comparison_expected'];
    case 'FixedCalculationResult':
      return ['threshold_metricValue', 'threshold_absoluteUpper', 'threshold_absoluteLower'];
    case 'ListComparisonResult':
      return ['comparison_observed'];
    case 'SchemaChangeResult':
      return [
        'columnList_added',
        'columnList_removed',
        'columnList_addedSample',
        'columnList_removedSample',
        'columnList_mode',
      ];
    case 'SeasonalResult':
      return [
        'threshold_calculatedUpper',
        'threshold_calculatedLower',
        'threshold_absoluteUpper',
        'threshold_absoluteLower',
        'threshold_metricValue',
      ];
    case 'StddevCalculationResult':
      return [
        'threshold_calculatedUpper',
        'threshold_calculatedLower',
        'threshold_absoluteUpper',
        'threshold_absoluteLower',
        'threshold_metricValue',
        'threshold_factor',
        'threshold_minBatchSize',
      ];
    case 'FrequentStringComparisonResult':
      return ['frequentStringComparison_operator', 'frequentStringComparison_sample'];
    case undefined:
    case null:
    case 'CalculationResult':
      // unset or base calculation result
      return [];
    case 'ConjunctionCalculationResult':
    case 'DisjunctionCalculationResult':
      // composes other analyzers
      return ['parent', 'childAnalyzerIds', 'childAnalysisIds'];
    default:
      logger.error('Encountered an unknown or invalid analyzer result type: %s', resultType);
      return [];
  }
};

export const analysisMetricToGQL = (context: OperationContext, metric: Maybe<string>): AnalysisMetric => {
  if (metric === undefined) {
    // this is valid for composed constraints
    return AnalysisMetric.Composed;
  }
  const analysisMetric = analysisMetricMap.get(metric as DataServiceAnalysisMetric);
  if (!analysisMetric) {
    logger.error(`Found unknown metric ${metric}${describeOperationContext(context)}`);
    return AnalysisMetric.Unknown;
  }
  return analysisMetric;
};

const analysisLevelMap = new Map<TargetLevel, AnalysisTargetLevel>([
  [TargetLevel.Dataset, AnalysisTargetLevel.Dataset],
  [TargetLevel.Column, AnalysisTargetLevel.Column],
]);

export const analysisLevelToGQL = (context: OperationContext, level: TargetLevel): AnalysisTargetLevel => {
  const analysisLevel = analysisLevelMap.get(level);
  if (!analysisLevel) {
    logger.error(`Found unknown analysis level ${level}${describeOperationContext(context)}`);
    return AnalysisTargetLevel.Unknown;
  }
  return analysisLevel;
};

const driftResultToGql = (drift: DriftContainer) => ({
  drift_metricValue: safeParseNumber(drift.drift_metricValue),
  drift_threshold: drift.drift_threshold,
});

const diffResultToGql = (diff: DiffContainer) => ({
  diff_metricValue: safeParseNumber(diff.diff_metricValue),
  diff_threshold: diff.diff_threshold,
  diff_mode: diff.diff_mode,
});

const columnListResultToGql = (col: ColumnListChangeContainer) => ({
  columnList_removed: col.columnList_removed,
  columnList_added: col.columnList_added,
  columnList_mode: col.columnList_mode,
  columnList_removedSample: col.columnList_removedSample,
  columnList_addedSample: col.columnList_addedSample,
});

const thresholdResultToGql = (thresh: ThresholdContainer) => ({
  threshold_baselineMetricValue: safeParseNumber(thresh.threshold_baselineMetricValue),
  threshold_calculatedLower: safeParseNumber(thresh.threshold_calculatedLower),
  threshold_calculatedUpper: safeParseNumber(thresh.threshold_calculatedUpper),
  threshold_absoluteLower: thresh.threshold_absoluteLower,
  threshold_absoluteUpper: thresh.threshold_absoluteUpper,
  threshold_factor: thresh.threshold_factor,
  threshold_minBatchSize: thresh.threshold_minBatchSize,
  threshold_metricValue: safeParseNumber(thresh.threshold_metricValue),
  threshold_type: thresh.threshold_type,
});

const seasonalResultToGql = (col: SeasonalContainer) => ({
  seasonal_adjusted_prediction: safeParseNumber(col.seasonal_adjusted_prediction),
  seasonal_replacement: safeParseNumber(col.seasonal_replacement),
  seasonal_shouldReplace: col.seasonal_shouldReplace,
  seasonal_lambdaKeep: col.seasonal_lambdaKeep,
});

const comparisonResultToGql = (col: ComparisonContainer) => ({
  comparison_expected: col.comparison_expected,
  comparison_observed: col.comparison_observed,
});

const frequentStringComparisonResultToGql = (col: FrequentStringComparisonContainer) => ({
  frequentStringComparison_operator: col.frequentStringComparison_operator,
  frequentStringComparison_sample: col.frequentStringComparison_sample,
});

const composedAnalyzerResultToGql = (result: AnalyzerResultResponse) => ({
  parent: result.parent,
  childAnalysisIds: result.childAnalysisIds,
  childAnalyzerIds: result.childAnalyzerIds,
});

export const analyzerResultsToGql = (context: OperationContext, result: AnalyzerResultResponse): AnalysisResult => {
  // incoming context was probably batched, so add back in the dataset id
  const enrichedContext = { ...context, datasetId: result.datasetId };
  // better to wrongly assign to overall dataset than to throw an error and
  // lose all analysis results
  let tags: SegmentTag[] = [];
  try {
    tags = segmentTextToTags(result.segment);
  } catch (tagErr) {
    if (tagErr instanceof Error) {
      logger.warn(`Tag error: ${tagErr.message} in org ${context.orgId} dataset ${context.datasetId}`);
    } else {
      logger.error(`Unexpected error ${tagErr} parsing tags in org ${context.orgId} dataset ${context.datasetId}`);
    }
  }
  return {
    algorithm: result.algorithm,
    algorithmMode: result.algorithmMode,
    analysisId: result.analysisId,
    analyzerConfigVersion: result.analyzerConfigVersion,
    analyzerId: result.analyzerId,
    analyzerResultType: result.analyzerResultType,
    analyzerType: result.analyzerType,
    calculationRuntimeNano: result.calculationRuntimeNano,
    category: metricToGQLCategory(result.metric, enrichedContext),
    column: result.column,
    creationTimestamp: result.creationTimestamp,
    datasetId: result.datasetId,
    datasetTimestamp: result.datasetTimestamp,
    explanationFields: analyzerResultTypeToFields(result.analyzerResultType),
    failureExplanation: result.failureExplanation,
    failureType: result.failureType,
    granularity: result.granularity,
    id: result.id,
    isAnomaly: (result.anomalyCount ?? 0) > 0,
    isFalseAlarm: !!result.userMarkedUnhelpful,
    metric: analysisMetricToGQL(enrichedContext, result.metric),
    monitorIds: result.monitorIds,
    // mostRecentDatasetDatalakeWriteTs not supported
    orgId: result.orgId,
    runId: result.runId,
    tags,
    targetLevel: result.targetLevel
      ? analysisLevelToGQL(enrichedContext, result.targetLevel)
      : AnalysisTargetLevel.Dataset,
    weight: result.segmentWeight,
    disableTargetRollup: !!result.disableTargetRollup,
    traceIds: result.traceIds ? result.traceIds.filter((t) => !!t) : undefined, // need to guard against null id which can happen in adhoc
    ...(result.parent && composedAnalyzerResultToGql(result)),
    ...(result.threshold && thresholdResultToGql(result.threshold)),
    ...(result.diff && diffResultToGql(result.diff)),
    ...(result.columnListChange && columnListResultToGql(result.columnListChange)),
    ...(result.drift && driftResultToGql(result.drift)),
    ...(result.comparison && comparisonResultToGql(result.comparison)),
    // seasonal results aren't actually part of AnalysisResult yet
    ...(result.seasonal && seasonalResultToGql(result.seasonal)),
    ...(result.frequentStringComparison && frequentStringComparisonResultToGql(result.frequentStringComparison)),
  };
};

const invertedAnalysisMetricMap = invertMap(analysisMetricMap);

export const analysisMetricToDataService = (metric: AnalysisMetric): DataServiceAnalysisMetric => {
  const converted = invertedAnalysisMetricMap.get(metric);
  if (!converted) {
    throw Error(`Unknown GQL analysis metric ${metric}`);
  }

  return converted;
};

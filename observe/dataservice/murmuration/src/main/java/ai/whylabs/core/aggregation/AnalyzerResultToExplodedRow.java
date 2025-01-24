package ai.whylabs.core.aggregation;

import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import lombok.val;

public class AnalyzerResultToExplodedRow {

  public static ExplodedRow to(AnalyzerResultResponse analyzerResult) {
    val eb =
        ExplodedRow.builder()
            .orgId(analyzerResult.getOrgId())
            .datasetId(analyzerResult.getDatasetId())
            .segmentText(analyzerResult.getSegment())
            .targetLevel(analyzerResult.getTargetLevel())
            .columnName(analyzerResult.getColumn())
            .ts(analyzerResult.getDatasetTimestamp())
            .feedbackAnalyzerId(analyzerResult.getAnalyzerId())
            .feedbackAnalysisId(analyzerResult.getAnalysisId())
            .rowTerminator(false)
            .feedbackRow(true)
            .ingestionMetricRow(false)
            .feedbackAlertCount(analyzerResult.getAnomalyCount());
    if (analyzerResult.getThreshold() != null) {
      eb.feedbackThresholdCalculatedLower(
              analyzerResult.getThreshold().getThreshold_calculatedUpper())
          .feedbackThresholdCalculatedUpper(
              analyzerResult.getThreshold().getThreshold_calculatedUpper())
          .feedbackThresholdMetricValue(analyzerResult.getThreshold().getThreshold_metricValue());
    }
    if (analyzerResult.getSeasonal() != null) {
      eb.feedbackSeasonalShouldReplace(analyzerResult.getSeasonal().getSeasonal_shouldReplace())
          .feedbackSeasonalLambdaKeep(analyzerResult.getSeasonal().getSeasonal_lambdaKeep())
          .feedbackSeasonalAdjustedPrediction(
              analyzerResult.getSeasonal().getSeasonal_adjusted_prediction())
          .feedbackSeasonalReplacement(analyzerResult.getSeasonal().getSeasonal_replacement());
    }

    if (analyzerResult.getDisableTargetRollup() != null
        && analyzerResult.getDisableTargetRollup()) {
      eb.aggregationDataGranularity(AggregationDataGranularity.INDIVIDUAL);
      eb.subPartition(V1ProfileFanoutImpl.getSubpartition(analyzerResult.getDatasetTimestamp()));
    } else {
      eb.aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
      eb.subPartition(0);
    }
    return eb.build();
  }

  public static ExplodedRow to(AnalyzerResult analyzerResult) {
    val eb =
        ExplodedRow.builder()
            .orgId(analyzerResult.getOrgId())
            .datasetId(analyzerResult.getDatasetId())
            .segmentText(analyzerResult.getSegment())
            .targetLevel(analyzerResult.getTargetLevel())
            .columnName(analyzerResult.getColumn())
            .ts(analyzerResult.getDatasetTimestamp())
            .feedbackAnalyzerId(analyzerResult.getAnalyzerId())
            .feedbackAnalysisId(analyzerResult.getAnalysisId())
            .feedbackThresholdCalculatedLower(analyzerResult.getThreshold_calculatedLower())
            .feedbackThresholdCalculatedUpper(analyzerResult.getThreshold_calculatedUpper())
            .feedbackThresholdMetricValue(analyzerResult.getThreshold_metricValue())
            .feedbackSeasonalShouldReplace(analyzerResult.getSeasonal_shouldReplace())
            .feedbackSeasonalLambdaKeep(analyzerResult.getSeasonal_lambdaKeep())
            .feedbackSeasonalAdjustedPrediction(analyzerResult.getSeasonal_adjusted_prediction())
            .feedbackSeasonalReplacement(analyzerResult.getSeasonal_replacement())
            .rowTerminator(false)
            .feedbackRow(true)
            .ingestionMetricRow(false)
            .feedbackAlertCount(analyzerResult.getAnomalyCount());

    if (analyzerResult.getDisableTargetRollup() != null
        && analyzerResult.getDisableTargetRollup()) {
      eb.aggregationDataGranularity(AggregationDataGranularity.INDIVIDUAL);
      eb.subPartition(V1ProfileFanoutImpl.getSubpartition(analyzerResult.getDatasetTimestamp()));
    } else {
      eb.aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
      eb.subPartition(0);
    }
    return eb.build();
  }

  public static AnalyzerResult to(ExplodedRow explodedRow) {
    return AnalyzerResult.builder()
        .analysisId(explodedRow.getFeedbackAnalysisId())
        .analyzerId(explodedRow.getFeedbackAnalyzerId())
        .anomalyCount(explodedRow.getFeedbackAlertCount())
        .targetLevel(explodedRow.getTargetLevel())
        .threshold_calculatedLower(explodedRow.getFeedbackThresholdCalculatedLower())
        .threshold_calculatedUpper(explodedRow.getFeedbackThresholdCalculatedUpper())
        .threshold_metricValue(explodedRow.getFeedbackThresholdMetricValue())
        .seasonal_lambdaKeep(explodedRow.getFeedbackSeasonalLambdaKeep())
        .seasonal_shouldReplace(explodedRow.getFeedbackSeasonalShouldReplace())
        .seasonal_adjusted_prediction(explodedRow.getFeedbackSeasonalAdjustedPrediction())
        .seasonal_replacement(explodedRow.getFeedbackSeasonalReplacement())
        .build();
  }
}

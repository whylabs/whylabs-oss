package ai.whylabs.songbird.v0.data

import ai.whylabs.dataservice.model.AnalyzerResultResponse

data class MetricThresholds(
    val metricValue: Double?,
    val lowerThreshold: Double?,
    val upperThreshold: Double?,
) {
    companion object {
        fun fromAnalysisResult(result: AnalyzerResultResponse): MetricThresholds {
            if (result.threshold != null) {
                // this case will cover diff metrics too
                val metricValue = result.threshold?.thresholdMetricValue
                val lower = result.threshold?.thresholdAbsoluteLower ?: result.threshold?.thresholdCalculatedLower
                val upper = result.threshold?.thresholdAbsoluteUpper ?: result.threshold?.thresholdCalculatedUpper
                return MetricThresholds(metricValue, lower, upper)
            }
            if (result.drift != null) {
                val metricValue = result.drift?.driftMetricValue
                val threshold = result.drift?.driftThreshold
                return MetricThresholds(metricValue, threshold, null)
            }
            return MetricThresholds(null, null, null)
        }
    }
}

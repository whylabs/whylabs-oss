package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class UnsupportedMetricsAndTypesValidator : MonitorConfigValidator {
    private val unsupportedDatasetMetrics = setOf(
        "profile.last_ingestion_time",
        "profile.first_ingestion_time",
        "unique_upper",
        "unique_upper_ratio",
        "unique_lower",
        "unique_lower_ratio",
    )
    private val unsupportedAnalyzerTypes = setOf(
        "experimental"
    )
    override fun validation(config: DocumentContext): ValidatorResult {
        // Checks for unsupported analyzer metrics and types
        val datasetMetrics = config.read<List<String>>("$.analyzers[*].config.metric").toSet()
        for (datasetMetric in datasetMetrics) {
            if (unsupportedDatasetMetrics.contains(datasetMetric)) {
                validatorResult = ValidatorResult.Error(contactUsMessage("dataset metric", datasetMetric))
                return validatorResult
            }
        }
        val analyzerTypes = config.read<List<String>>("$.analyzers[*].config.type").toSet()
        for (analyzerType in analyzerTypes) {
            if (unsupportedAnalyzerTypes.contains(analyzerType)) {
                validatorResult = ValidatorResult.Error(contactUsMessage("analyzer type", analyzerType))
                return validatorResult
            }
        }

        validatorResult = ValidatorResult.Success
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult

    private fun contactUsMessage(featureType: String, featureValue: String): String {
        return "To enable $featureType $featureValue, please contact us at support@whylabs.ai"
    }
}

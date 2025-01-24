package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class MultiAnalyzerMonitorsValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        // Checks for monitors with multiple analyzers
        val monitorsWithMultipleAnalyzers = config.read<List<Map<String, String>>>("$.monitors[?(@.analyzerIds.length() >= 2)]")
        validatorResult = if (monitorsWithMultipleAnalyzers.isNotEmpty()) {
            ValidatorResult.Error("More than one analyzer for a single monitor.")
        } else {
            ValidatorResult.Success
        }
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class AnalyzerDoesNotHaveConfigValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        // Checks for analyzer config which does not make sense
        val comparisonConfigs = config.read<List<Map<String, String>>>("$.analyzers[?(@.config.type == 'comparison' || @.config.type == 'list_comparison')].config")
        comparisonConfigs.forEach {
            if (!it.keys.contains("expected") && !it.keys.contains("baseline")) {
                validatorResult = ValidatorResult.Error("One of 'expected' or 'baseline' expected for comparison config")
                return validatorResult
            }
        }
        val invalidContinuousWithFreqItems = config.read<List<Map<String, String>>>("$.analyzers[?('group:continuous' in @.targetMatrix.include && 'frequent_items' == @.config.metric)]")
        if (!invalidContinuousWithFreqItems.isNullOrEmpty()) {
            validatorResult = ValidatorResult.Error("frequent_items metric is not supported for group:continuous target")
            return validatorResult
        }
        val invalidDiscreteWithHistogram = config.read<List<Map<String, String>>>("$.analyzers[?('group:discrete' in @.targetMatrix.include && 'histogram' == @.config.metric)]")
        if (!invalidDiscreteWithHistogram.isNullOrEmpty()) {
            validatorResult = ValidatorResult.Error("histogram metric is not supported for group:discrete target")
            return validatorResult
        }
        return ValidatorResult.Success
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

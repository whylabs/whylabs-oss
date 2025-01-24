package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class MonitorToAnalyzerUniquenessValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val nonCompositeAnalyzerIds = config.read<List<String>>("$.analyzers[?(@.config.type != 'conjunction' && @.config.type != 'disjunction')].id")
        val hasDuplicates = nonCompositeAnalyzerIds.groupingBy { it }.eachCount().any { it.value > 1 }

        validatorResult = if (hasDuplicates) {
            ValidatorResult.Warning("The same analyzer ID cannot be used for multiple monitors.")
        } else {
            ValidatorResult.Success
        }
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

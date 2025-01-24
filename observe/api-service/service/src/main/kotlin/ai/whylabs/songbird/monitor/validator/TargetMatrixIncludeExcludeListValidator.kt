package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.Analyzer
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class TargetMatrixIncludeExcludeListValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val analyzers = config.read<List<Map<String, String>>>("$.analyzers[*]")

        if (analyzers.isEmpty()) {
            return ValidatorResult.Success
        }

        val mapper = jacksonObjectMapper()
        val analyzersObj: List<Analyzer> = mapper.readValue(
            mapper.writeValueAsString(analyzers),
            object :
                TypeReference<List<Analyzer>>() {}
        )

        for (analyzer in analyzersObj) {
            if (analyzer.targetMatrix != null && analyzer.targetMatrix.type != "dataset" && analyzer.targetMatrix.include.isNullOrEmpty()) {
                return ValidatorResult.Warning("${analyzer.id}'s targetMatrix include List is empty")
            }
        }

        val analyzerIncludeList = config.read<List<String>>("$.analyzers[?(@.config.type != 'conjunction' || @.config.type != 'disjunction')].targetMatrix.include[*]")
        val analyzerExcludeList = config.read<List<String>>("$.analyzers[?(@.config.type != 'conjunction' || @.config.type != 'disjunction')].targetMatrix.exclude[*]")

        validatorResult = if (analyzerIncludeList.hasInvalidFeaturePredicates()) {
            ValidatorResult.Warning("targetMatrix's include List $analyzerIncludeList is not supported")
        } else if (analyzerExcludeList.hasInvalidFeaturePredicates()) {
            ValidatorResult.Warning("targetMatrix's exclude List $analyzerExcludeList is not supported")
        } else {
            ValidatorResult.Success
        }
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult

    private fun List<String>.hasInvalidFeaturePredicates(): Boolean {
        if (this.isEmpty()) {
            return false
        }
        return this.all { value ->
            value.startsWith("group:") && !SupportedPredicates.values().any { it.value == value }
        }
    }
}

enum class SupportedPredicates(val value: String) {
    DISCRETE_GROUP("group:discrete"),
    CONTINUOUS_GROUP("group:continuous"),
    INPUT_GROUP("group:input"),
    OUTPUT_GROUP("group:output")
}

package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.Analyzer
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class TargetMatrixValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val analyzers = config.read<List<Map<String, String>>>("$.analyzers[?(@.config.type != 'conjunction' || @.config.type != 'disjunction')]")

        val validatorResult = if (targetMatrixIsInvalid(analyzers)) {
            ValidatorResult.Warning("targetMatrix for non-composite analyzers can't be null")
        } else {
            ValidatorResult.Success
        }
        return validatorResult
    }

    private fun targetMatrixIsInvalid(analyzers: List<Map<String, String>>): Boolean {
        for (analyzer in analyzers) {
            val analyzerJson = jacksonObjectMapper().writeValueAsString(analyzer)
            val analyzerObject = jacksonObjectMapper().readValue(analyzerJson, Analyzer::class.java)
            if (analyzerObject.targetMatrix == null) {
                return true
            }
        }
        return false
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

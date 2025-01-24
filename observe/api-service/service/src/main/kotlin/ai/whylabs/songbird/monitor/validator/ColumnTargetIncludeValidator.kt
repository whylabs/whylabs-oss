package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.AnalyzerTargetMatrix
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class ColumnTargetIncludeValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val mapper = jacksonObjectMapper()
        val columnTargetMatricesAsString = mapper.writeValueAsString(config.read<List<Map<String, String>>>("$.analyzers[?(@.targetMatrix.type == 'column')].targetMatrix"))
        val columnTargetMatrices = mapper.readValue(columnTargetMatricesAsString, Array<AnalyzerTargetMatrix>::class.java)

        for (targetMatrix in columnTargetMatrices) {
            if (targetMatrix.include.isNullOrEmpty()) {
                return ValidatorResult.Warning("At least one item on the include list must be present if using ColumnMatrix")
            }
        }
        return ValidatorResult.Success
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

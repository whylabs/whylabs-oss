package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.Analyzer
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class MonotonicAnalyzerValidator : MonitorConfigValidator {
    private val objectMapper = jacksonObjectMapper()

    override fun validation(config: DocumentContext): ValidatorResult {
        val typeRef = object : TypeReference<List<Analyzer>>() {}
        val jsonString = objectMapper.writeValueAsString(config.read<List<Map<String, String>>>("$.analyzers[?(@.config.type == 'monotonic')]"))
        val monotonicConfigs: List<Analyzer> = objectMapper.readValue(jsonString, typeRef)

        monotonicConfigs.forEach {
            val targetSize = it.targetSize
            if (targetSize != null && targetSize < 2) {
                validatorResult = ValidatorResult.Error("Target size should be at least 2 for monotonic analyzers.")
            }
        }

        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

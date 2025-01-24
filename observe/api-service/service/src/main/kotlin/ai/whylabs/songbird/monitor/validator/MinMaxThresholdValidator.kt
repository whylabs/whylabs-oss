package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.AnalyzerConfig
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.DocumentContext

class MinMaxThresholdValidator : MonitorConfigValidator {
    private val objectMapper = jacksonObjectMapper()
    override fun validation(config: DocumentContext): ValidatorResult {
        val typeRef = object : TypeReference<List<AnalyzerConfig>>() {}
        val jsonString = objectMapper.writeValueAsString(config.read<List<Map<String, String>>>("$.analyzers[?(@.config.type == 'fixed' || @.config.type == 'seasonal' || @.config.type == 'stddev')].config"))

        val thresholdConfigs: List<AnalyzerConfig> = objectMapper.readValue(jsonString, typeRef)

        thresholdConfigs.forEach {
            val lowerAsDouble = it.lower?.toDouble()
            val upperAsDouble = it.upper?.toDouble()

            if (lowerAsDouble != null && upperAsDouble != null && lowerAsDouble > upperAsDouble) {
                return ValidatorResult.Error("Lower threshold should be less than upper threshold")
            }

            val minLowerThresholdAsDouble = it.minLowerThreshold?.toDouble()
            val maxUpperThresholdAsDouble = it.maxUpperThreshold?.toDouble()

            if (minLowerThresholdAsDouble != null && maxUpperThresholdAsDouble != null && minLowerThresholdAsDouble > maxUpperThresholdAsDouble) {
                return ValidatorResult.Error("minLowerThreshold should be less than maxUpperThreshold")
            }
        }
        return ValidatorResult.Success
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

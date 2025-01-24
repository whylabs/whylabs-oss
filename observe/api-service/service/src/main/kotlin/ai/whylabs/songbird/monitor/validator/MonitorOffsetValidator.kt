package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext
import kotlin.time.Duration

class MonitorOffsetValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val orgId = config.read<String>("$.orgId")
        // Checks for offset validity
        val offsets = config.read<List<String>>("$.monitors[*].mode.datasetTimestampOffset")
        offsets.toSet().forEach {
            val duration = Duration.parseIsoStringOrNull(it)
            if (duration == null) {
                validatorResult = ValidatorResult.Error("Invalid value '$it' provided for datasetTimestampOffset.")
                return validatorResult
            }
        }
        validatorResult = ValidatorResult.Success
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

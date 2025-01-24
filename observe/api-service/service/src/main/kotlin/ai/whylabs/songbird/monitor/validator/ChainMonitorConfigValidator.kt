package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class ChainMonitorConfigValidator(private vararg val validators: MonitorConfigValidator) : MonitorConfigValidator {

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult

    override fun validation(config: DocumentContext): ValidatorResult {
        var resultState: ValidatorResult = ValidatorResult.Success

        validators.forEach { validator ->
            when (val result = validator.validation(config)) {
                is ValidatorResult.Error -> {
                    validatorResult = result
                    return result
                }
                is ValidatorResult.Warning -> { resultState = result }
                else -> { }
            }
        }
        return resultState
    }
}

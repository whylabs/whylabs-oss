package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

interface MonitorConfigValidator {
    fun validation(config: DocumentContext): ValidatorResult
    var validatorResult: ValidatorResult
}

sealed class ValidatorResult {
    class Error(val message: String) : ValidatorResult()
    object NoResult : ValidatorResult()
    object Success : ValidatorResult()
    class Warning(val message: String) : ValidatorResult()
}

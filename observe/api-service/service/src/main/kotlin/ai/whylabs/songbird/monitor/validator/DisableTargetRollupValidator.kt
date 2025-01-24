package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.dataservice.DataService
import com.jayway.jsonpath.DocumentContext

class DisableTargetRollupValidator(private val dataService: DataService) : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val analyzerWithDisableTargetRollupAndNonNullBaseline =
            config.read<List<String>>("$.analyzers[?(@.disableTargetRollup == true && @.config.baseline != null)]")
        if (!analyzerWithDisableTargetRollupAndNonNullBaseline.isNullOrEmpty()) {
            validatorResult =
                ValidatorResult.Error("Config baseline must be null with disableTargetRollup option enabled.")
            return validatorResult
        }
        return ValidatorResult.Success
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult
}

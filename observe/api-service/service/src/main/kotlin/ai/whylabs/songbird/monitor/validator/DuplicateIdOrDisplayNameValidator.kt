package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext

class DuplicateIdOrDisplayNameValidator : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        // Duplicate ids or display names for analyzers and monitors
        val analyzerIds = config.read<List<String>>("$.analyzers[*].id")
        if (hasDuplicates(analyzerIds)) {
            validatorResult = ValidatorResult.Error("Duplicate analyzer ids set in the configuration: ${printDuplicates(analyzerIds)}")
            return validatorResult
        }
        val monitorIds = config.read<List<String>>("$.monitors[*].id")
        if (hasDuplicates(monitorIds)) {
            validatorResult = ValidatorResult.Error("Duplicate monitor ids set in the configuration: ${printDuplicates(monitorIds)}")
            return validatorResult
        }
        val monitorDisplayNames = config.read<List<String>>("$.monitors[*].displayName")
        if (hasDuplicates(monitorDisplayNames)) {
            validatorResult = ValidatorResult.Error("Duplicate monitor display names set in the configuration: ${printDuplicates(monitorDisplayNames)}")
            return validatorResult
        }

        validatorResult = ValidatorResult.Success
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult

    private fun <T> hasDuplicates(items: List<T>): Boolean {
        return items.size != items.distinct().count()
    }

    private fun <T> printDuplicates(items: List<T>, separator: String = ", "): String {
        return items.groupingBy { it }.eachCount().filter { it.value > 1 }.keys.joinToString(separator)
    }
}

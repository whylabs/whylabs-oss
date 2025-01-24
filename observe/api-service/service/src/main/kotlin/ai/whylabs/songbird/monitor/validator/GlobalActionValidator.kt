package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.monitor.MonitorConfigValidationException
import ai.whylabs.songbird.v0.dao.NotificationActionDAO
import com.jayway.jsonpath.DocumentContext

class GlobalActionValidator(private val notificationActionDAO: NotificationActionDAO) : MonitorConfigValidator {
    override fun validation(config: DocumentContext): ValidatorResult {
        val orgId = config.read<String>("$.orgId")
        // Checks for global action validity
        val actions = config.read<List<String>>("$.monitors[*].actions[*].type")
        actions.toSet().forEach {
            if (it != "global") {
                // Only global actions are supported. Organization notifications are global type with reserved target ids: email, slack, pagerduty
                validatorResult = ValidatorResult.Error("Invalid value '$it' provided for action type.")
                return validatorResult
            }
        }
        val globalActions = config.read<List<Map<String, String>>>("$.monitors[*].actions[?(@.type == 'global')]")
        globalActions.distinctBy { it["target"] }.forEach {
            if (!it.keys.contains("target")) {
                validatorResult = ValidatorResult.Error("A global action is configured without a target.")
                return validatorResult
            }
            try {
                validateGlobalActionTarget(orgId, it["target"]!!)
            } catch (e: MonitorConfigValidationException) {
                validatorResult = ValidatorResult.Error(e.message!!)
                return validatorResult
            }
        }

        validatorResult = ValidatorResult.Success
        return validatorResult
    }

    override var validatorResult: ValidatorResult = ValidatorResult.NoResult

    private fun validateGlobalActionTarget(orgId: String, targetId: String) {
        notificationActionDAO.getNotificationAction(
            orgId = orgId,
            actionId = targetId
        ) ?: throw MonitorConfigValidationException("Unable to find notification action target ID $targetId.")
    }
}

package ai.whylabs.songbird.notification

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ArgumentValueException
import ai.whylabs.songbird.operations.ResourceAlreadyExistsException
import ai.whylabs.songbird.operations.ResourceConstraintException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.util.EmailUtils
import ai.whylabs.songbird.v0.dao.NotificationActionDAO
import ai.whylabs.songbird.v0.ddb.ActionType
import ai.whylabs.songbird.v0.ddb.NotificationRelationshipItem
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class NotificationActionHandler @Inject constructor(
    private val notificationActionDAO: NotificationActionDAO,
    private val notificationTester: NotificationTester,
    private val ddbMapper: DynamoDBMapper,
) : JsonLogging {
    private val mapper = jacksonObjectMapper()

    fun listNotificationActions(orgId: String): List<NotificationAction> {
        return notificationActionDAO.listNotificationActions(orgId = orgId).map { action ->
            if (action.type == null || action.payload == null)
                throw ArgumentValueException("Notification action payload is empty ${mapper.writeValueAsString(action)}", "action")

            NotificationAction(
                id = action.id,
                enabled = action.enabled,
                type = action.type!!,
                payload = parseNotificationActionPayload(action.id, action.type!!, action.payload!!),
                references = action.references,
                creationTime = action.creationTime,
                lastUpdate = action.lastUpdate
            )
        }
    }

    fun getNotificationAction(orgId: String, actionId: String): NotificationAction {
        val result = notificationActionDAO.getNotificationAction(
            orgId = orgId,
            actionId = actionId
        ) ?: throw ResourceNotFoundException("notification action", actionId, "Action $actionId not found")

        if (result.type == null || result.payload == null)
            throw ArgumentValueException("Notification action payload is empty ${mapper.writeValueAsString(result)}", "action")

        val payload = parseNotificationActionPayload(actionId, result.type!!, result.payload!!)

        return NotificationAction(
            id = result.id,
            enabled = result.enabled,
            type = result.type!!,
            payload = payload,
            references = result.references,
            creationTime = result.creationTime,
            lastUpdate = result.lastUpdate
        )
    }

    fun testNotificationAction(orgId: String, actionId: String) {
        val action = getNotificationAction(orgId, actionId)
        notificationTester.testAction(orgId, action.id)
    }

    private fun validateActionId(actionId: String) {
        val re = Regex("^[0-9a-zA-Z_-]+\$")
        if (!re.matches(actionId)) {
            throw ArgumentValueException("Invalid value '$actionId'. Only alphanumeric, dash, and underscore are allowed.", "actionId")
        }
    }
    fun createNotificationAction(orgId: String, actionId: String, type: ActionType, payload: String) {
        validateActionId(actionId)
        notificationActionDAO.createNotificationAction(
            orgId = orgId,
            actionId = actionId,
            type = type,
            payload = mapper.writeValueAsString(parseNotificationActionPayload(actionId, type, payload))
        )
    }

    fun createOrUpdateNotificationAction(orgId: String, actionId: String, type: ActionType, payload: String) {
        try {
            createNotificationAction(orgId, actionId, type, payload)
        } catch (e: ResourceAlreadyExistsException) {
            updateNotificationAction(orgId, actionId, type, payload)
        }
    }

    fun updateNotificationAction(orgId: String, actionId: String, type: ActionType, payload: String) {
        notificationActionDAO.updateNotificationAction(
            orgId = orgId,
            actionId = actionId,
            type = type,
            payload = mapper.writeValueAsString(parseNotificationActionPayload(actionId, type, payload))
        )
    }

    fun addNotificationRelationship(orgId: String, actionId: String, relationship: NotificationRelationshipItem) {
        val notification = notificationActionDAO.getNotificationAction(orgId, actionId)
        val relationships = ((notification?.references ?: emptyList()) + listOf(relationship))
            .distinctBy { Triple(it.type, it.datasetId, it.itemId) }
        val updated = notification?.copy(references = relationships)
        ddbMapper.save(updated)
    }

    fun deleteNotificationRelationship(orgId: String, actionId: String, relationship: NotificationRelationshipItem) {
        val notification = notificationActionDAO.getNotificationAction(orgId, actionId)
        if (notification?.references != null) {
            val updated = notification.references!!.filterNot {
                it.type == relationship.type &&
                    it.datasetId == relationship.datasetId &&
                    it.itemId == relationship.itemId
            }
            ddbMapper.save(notification.copy(references = updated))
        }
    }

    fun enableNotificationAction(orgId: String, actionId: String) {
        notificationActionDAO.enableNotificationAction(
            orgId = orgId,
            actionId = actionId
        )
    }

    fun disableNotificationAction(orgId: String, actionId: String) {
        notificationActionDAO.disableNotificationAction(
            orgId = orgId,
            actionId = actionId
        )
    }

    fun deleteNotificationAction(orgId: String, actionId: String) {
        val notification = getNotificationAction(orgId, actionId)
        if (notification.references?.isNotEmpty() == true) {
            throw ResourceConstraintException("notification action", actionId, "Cannot delete notification action $actionId because it is used by ${notification.references.size} references.")
        }
        notificationActionDAO.deleteNotificationAction(
            orgId = orgId,
            actionId = actionId
        )
    }

    private fun parseNotificationActionPayload(id: String, type: ActionType, payload: String): NotificationActionPayload {
        return when (type) {
            ActionType.EMAIL -> {
                val emailAction = mapper.readValue<EmailNotificationAction>(payload)
                EmailUtils.requireValid(emailAction.email)
                emailAction
            }
            ActionType.PAGER_DUTY -> {
                val pagerDutyAction = mapper.readValue<PagerDutyNotificationAction>(payload)
                if (pagerDutyAction.pagerDutyKey.isBlank()) {
                    throw ArgumentValueException("Notification action $id payload is empty.", "action")
                }
                pagerDutyAction
            }
            ActionType.SLACK -> {
                val slackAction = mapper.readValue<SlackNotificationAction>(payload)
                if (slackAction.slackWebhook.isBlank()) {
                    throw ArgumentValueException("Notification action $id payload is empty.", "action")
                }
                slackAction
            }
            ActionType.TEAMS -> {
                val teamsAction = mapper.readValue<TeamsNotificationAction>(payload)
                if (teamsAction.webhook.isBlank()) {
                    throw ArgumentValueException("Notification action $id payload is empty.", "action")
                }
                teamsAction
            }
            ActionType.WEBHOOK -> {
                val webhookAction = mapper.readValue<WebhookNotificationAction>(payload)
                if (webhookAction.url.isBlank()) {
                    throw ArgumentValueException("Notification action $id expects a url.", "action")
                }
                webhookAction
            }
            else -> {
                throw ArgumentValueException("Unsupported action type $type", "type")
            }
        }
    }
}

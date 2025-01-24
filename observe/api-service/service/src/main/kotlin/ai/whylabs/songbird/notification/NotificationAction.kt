package ai.whylabs.songbird.notification

import ai.whylabs.songbird.v0.ddb.ActionType
import ai.whylabs.songbird.v0.ddb.NotificationRelationshipItem
import ai.whylabs.songbird.v0.ddb.PlaceHolder
import io.swagger.v3.oas.annotations.media.Schema
import java.util.Date

@Schema(description = "Notification Action", requiredProperties = ["id", "type", "payload", "lastUpdate"])
data class NotificationAction(
    val id: String,
    val type: ActionType,
    val enabled: Boolean? = true,
    val payload: NotificationActionPayload,
    val references: List<NotificationRelationshipItem>? = emptyList(),
    val creationTime: Date?,
    val lastUpdate: Date
)

@Schema(oneOf = [EmailNotificationAction::class, SlackNotificationAction::class, PagerDutyNotificationAction::class, TeamsNotificationAction::class, WebhookNotificationAction::class])
interface NotificationActionPayload

@Schema(description = "Email payload for Notification Actions", requiredProperties = ["email"])
data class EmailNotificationAction(
    val email: String = PlaceHolder,
) : NotificationActionPayload

@Schema(description = "Slack payload for Notification Actions", requiredProperties = ["slackWebhook"])
data class SlackNotificationAction(
    val slackWebhook: String = PlaceHolder,
) : NotificationActionPayload

@Schema(description = "Microsoft Teams payload for Notification Actions", requiredProperties = ["webhook"])
data class TeamsNotificationAction(
    val webhook: String = PlaceHolder,
) : NotificationActionPayload

@Schema(description = "Pager Duty payload for Notification Actions", requiredProperties = ["pagerDutyKey"])
data class PagerDutyNotificationAction(
    val pagerDutyKey: String = PlaceHolder,
) : NotificationActionPayload

@Schema(description = "Webhook payload for Notification Actions", requiredProperties = ["url", "method"])
data class WebhookNotificationAction(
    val url: String = PlaceHolder,
    val method: String = "POST",
    val headers: Map<String, String> = emptyMap(),
    val body: String? = null,
) : NotificationActionPayload

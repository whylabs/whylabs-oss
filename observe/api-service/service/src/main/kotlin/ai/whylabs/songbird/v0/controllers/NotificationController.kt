package ai.whylabs.songbird.v0.controllers

import ai.whylabs.dataservice.invoker.ApiException
import ai.whylabs.dataservice.model.AckDigestRequest
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.notification.EmailNotificationAction
import ai.whylabs.songbird.notification.NotificationAction
import ai.whylabs.songbird.notification.NotificationActionHandler
import ai.whylabs.songbird.notification.PagerDutyNotificationAction
import ai.whylabs.songbird.notification.SlackNotificationAction
import ai.whylabs.songbird.notification.TeamsNotificationAction
import ai.whylabs.songbird.notification.WebhookNotificationAction
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.ReadNotificationRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteNotificationRole
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.ddb.ActionType
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Patch
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import java.time.OffsetDateTime

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/notification-settings")
@Tags(
    Tag(name = "Notification Settings", description = "Endpoint for managing notification settings"),
)
@Secured(AdministratorRole, UserRole)
class NotificationController @Inject constructor(
    private val notificationActionHandler: NotificationActionHandler,
    private val dataService: DataService,
) : JsonLogging {
    @Operation(
        operationId = "ListNotificationActions",
        summary = "List notification actions for an org",
        description = "Get notification actions for an org",
    )
    @Get(uri = "/{org_id}/actions", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadNotificationRole, WriteNotificationRole)
    fun listNotificationActions(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String
    ): List<NotificationAction> {
        return notificationActionHandler.listNotificationActions(org_id)
    }

    @Operation(
        operationId = "GetNotificationAction",
        summary = "Get notification action for id",
        description = "Get notification action for id",
    )
    @Get(uri = "/{org_id}/actions/{action_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadNotificationRole, WriteNotificationRole)
    fun getNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String
    ): NotificationAction {
        return notificationActionHandler.getNotificationAction(org_id, action_id)
    }

    @Operation(
        operationId = "TestNotificationAction",
        summary = "Test a notification action",
        description = "Test a notification action",
    )
    @Post(uri = "/{org_id}/actions/{action_id}/test", consumes = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteNotificationRole)
    fun testNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String,
    ) {
        notificationActionHandler.testNotificationAction(org_id, action_id)
    }

    @Operation(
        operationId = "AddNotificationAction",
        summary = "Add new notification action",
        description = "Add new notification action",
    )
    @Post(uri = "/{org_id}/actions/{type}/{action_id}", consumes = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteNotificationRole)
    fun addNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(enumAsRef = true) type: ActionType,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String,
        @Body payload: String
    ) {
        notificationActionHandler.createNotificationAction(org_id, action_id, type, payload)
    }

    @Operation(
        operationId = "PutNotificationAction",
        summary = "Add new notification action",
        description = "Add new notification action",
    )
    @Put(uri = "/{org_id}/actions/{type}/{action_id}", consumes = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteNotificationRole)
    fun putNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(enumAsRef = true) type: ActionType,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String,
        @Body payload: String
    ) {
        notificationActionHandler.createOrUpdateNotificationAction(org_id, action_id, type, payload)
    }

    @Operation(
        operationId = "getEmailNotificationActionPayload",
        summary = "Get dummy notification action payload",
        description = "Get dummy notification action payload",
    )
    @Get(uri = "/actions/email/payload", produces = [MediaType.APPLICATION_JSON])
    fun getEmailNotificationActionPayload(): EmailNotificationAction {
        return EmailNotificationAction()
    }

    @Operation(
        operationId = "getSlackNotificationActionPayload",
        summary = "Get dummy notification action payload",
        description = "Get dummy notification action payload",
    )
    @Get(uri = "/actions/slack/payload", produces = [MediaType.APPLICATION_JSON])
    fun getSlackNotificationActionPayload(): SlackNotificationAction {
        return SlackNotificationAction()
    }

    @Operation(
        operationId = "getTeamsNotificationActionPayload",
        summary = "Get dummy notification action payload",
        description = "Get dummy notification action payload",
    )
    @Get(uri = "/actions/teams/payload", produces = [MediaType.APPLICATION_JSON])
    fun getTeamsNotificationActionPayload(): TeamsNotificationAction {
        return TeamsNotificationAction()
    }

    @Operation(
        operationId = "getPagerDutyNotificationActionPayload",
        summary = "Get dummy notification action payload",
        description = "Get dummy notification action payload",
    )
    @Get(uri = "/actions/pagerduty/payload", produces = [MediaType.APPLICATION_JSON])
    fun getPagerDutyNotificationActionPayload(): PagerDutyNotificationAction {
        return PagerDutyNotificationAction()
    }

    @Operation(
        operationId = "getWebhookNotificationActionPayload",
        summary = "Get dummy notification action payload for webhooks",
        description = "Get dummy notification action payload for webhooks",
    )
    @Get(uri = "/actions/webhook/payload", produces = [MediaType.APPLICATION_JSON])
    fun getWebhookNotificationActionPayload(): WebhookNotificationAction {
        return WebhookNotificationAction()
    }

    @Operation(
        operationId = "UpdateNotificationAction",
        summary = "Update notification action",
        description = "Update notification action",
    )
    @Patch(uri = "/{org_id}/actions/{type}/{action_id}", consumes = [MediaType.APPLICATION_JSON])
    fun updateNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(enumAsRef = true) type: ActionType,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String,
        @Body payload: String
    ) {
        notificationActionHandler.updateNotificationAction(org_id, action_id, type, payload)
    }

    @Operation(
        operationId = "EnableNotificationAction",
        summary = "Enable notification action",
        description = "Enable notification action",
    )
    @Put(uri = "/{org_id}/actions/{action_id}/enable")
    fun enableNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String
    ) {
        notificationActionHandler.enableNotificationAction(org_id, action_id)
    }

    @Operation(
        operationId = "DisableNotificationAction",
        summary = "Disable notification action",
        description = "Disable notification action",
    )
    @Put(uri = "/{org_id}/actions/{action_id}/disable")
    fun disableNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String
    ) {
        notificationActionHandler.disableNotificationAction(org_id, action_id)
    }

    @Operation(
        operationId = "DeleteNotificationAction",
        summary = "Delete notification action",
        description = "Delete notification action",
    )
    @Delete(uri = "/{org_id}/actions/{action_id}")
    fun deleteNotificationAction(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String
    ) {
        notificationActionHandler.deleteNotificationAction(org_id, action_id)
    }

    @Operation(
        operationId = "AcknowledgeNotification",
        summary = "Acknowledge a notification",
        description = "Acknowledge a notification to data service",
        tags = ["Internal"],
    )
    @Put(uri = "/{org_id}/actions/{action_id}/acknowledge")
    @WhyLabsInternal
    fun acknowledgeNotification(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleNotificationActionId) action_id: String,
        @Body request: AcknowledgeNotificationRequest
    ): Response {
        try {
            dataService.notificationApi.acknowledgeImmediateDigest(
                AckDigestRequest()
                    .orgId(org_id)
                    .runId(action_id)
                    .datasetId(request.datasetId)
                    .monitorId(request.monitorId)
                    .sentTimestamp(request.timestamp)
            )
            return Response()
        } catch (e: ApiException) {
            if (e.code == 410) {
                throw ResourceNotFoundException("Anomaly not found")
            }
            throw e
        }
    }
}

data class AcknowledgeNotificationRequest(
    val datasetId: String,
    val monitorId: String,
    val timestamp: OffsetDateTime,
)

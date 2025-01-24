package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.azure.NullableAzureEventHubClient
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsResourceHeader
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteDataRole
import ai.whylabs.songbird.util.OrgUtils
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v1.models.ExportTracePartialSuccess
import ai.whylabs.songbird.v1.models.ExportTraceServiceResponse
import ai.whylabs.songbird.v1.models.RejectCounter
import ai.whylabs.songbird.v1.models.Tracing
import com.azure.messaging.eventhubs.EventData
import com.google.gson.FieldNamingPolicy
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.protobuf.util.JsonFormat
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Header
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import java.io.ByteArrayInputStream
import java.io.InputStreamReader
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceResponse as OtelExportTraceServiceResponse

const val ProtobufMediaType = "application/x-protobuf"

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1")
@Tag(name = "Traces", description = "Endpoint for ingesting spans and traces")
@Secured(AdministratorRole, UserRole)
class TracesController(
    private val config: EnvironmentConfig,
    private val eventHubClient: NullableAzureEventHubClient,
    private val organizationDAO: OrganizationDAO,
    private val orgUtils: OrgUtils,
) : JsonLogging {
    companion object {
        private val gson: Gson = GsonBuilder().setFieldNamingPolicy(FieldNamingPolicy.IDENTITY).create()
    }

    @Operation(
        operationId = "ExportTraces",
        summary = "Export traces into WhyLabs",
        description = "API to export traces into WhyLabs",
    )
    @Post(
        uri = "/traces",
        produces = [MediaType.APPLICATION_JSON],
        consumes = [MediaType.APPLICATION_JSON],
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    fun exportTraces(
        @Schema(description = "WhyLabs resource ID", example = "resource-1")
        @Header(WhyLabsResourceHeader) resourceId: String?,
        @Body data: ByteArray,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): ExportTraceServiceResponse {
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(orgId) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }
        val structBuilder = ExportTraceServiceRequest.newBuilder()
        val reader = InputStreamReader(ByteArrayInputStream(data))
        JsonFormat.parser().ignoringUnknownFields().merge(reader, structBuilder)
        val resourceSpans = structBuilder.build()

        val rejectCounter = RejectCounter.initial()
        try {
            processSpans(resourceSpans, orgId, resourceId?.trim(), rejectCounter)
        } catch (e: Throwable) {
            log.warn("Failed to process message: {}", e.message)
        }

        if (rejectCounter.count > 0) {
            return ExportTraceServiceResponse(
                partialSuccess = ExportTracePartialSuccess(
                    rejectedSpans = rejectCounter.count,
                    errorMessage = rejectCounter.errorMessage()
                )
            )
        }

        return ExportTraceServiceResponse(partialSuccess = null)
    }

    @Throws(IllegalArgumentException::class)
    @Operation(
        operationId = "ExportTraces",
        summary = "Export traces into WhyLabs",
        description = "API to export traces into WhyLabs",
    )
    @Post(
        uri = "/traces",
        produces = [ProtobufMediaType],
        consumes = [ProtobufMediaType],
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    fun exportTracesProto(
        @Schema(description = "WhyLabs resource ID", example = "resource-1")
        @Header(WhyLabsResourceHeader) resourceId: String?,
        @Body data: ByteArray,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(RequestOrganizationId) orgId: String,
    ): ByteArray? {
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(orgId) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }
        val resourceSpans = try {
            ExportTraceServiceRequest.parseFrom(data)
        } catch (e: Exception) {
            throw IllegalArgumentException("Invalid format", e)
        }

        val rejectCounter = RejectCounter.initial()
        try {
            processSpans(resourceSpans, orgId, resourceId?.trim(), rejectCounter)
        } catch (e: Throwable) {
            log.warn("Failed to process message: {}", e.message)
        }

        val resBuilder = OtelExportTraceServiceResponse.newBuilder()
        if (rejectCounter.count > 0) {
            resBuilder.partialSuccessBuilder
                .setRejectedSpans(rejectCounter.count)
                .setErrorMessage(rejectCounter.errorMessage())
        }
        return resBuilder.build().toByteArray()
    }

    private fun processSpans(
        resourceSpans: ExportTraceServiceRequest,
        orgId: String,
        overrideResourceId: String?,
        rejectCounter: RejectCounter,
    ) {
        val ehClient = eventHubClient.get()
        var eventDataBatch = ehClient.createBatch()

        val spans = Tracing.toSpans(orgId, overrideResourceId, resourceSpans, rejectCounter)
        var commonResourceId: String? = null
        // Find the common resource ID for all spans and set it for all spans
        spans.forEach {
            val resourceId = it.ResourceId
            if (!resourceId.isNullOrEmpty()) {
                commonResourceId = resourceId
            }
        }
        val spansToSend = spans.map { it.copy(ResourceId = commonResourceId) }

        spansToSend
            .forEach {
                val eventData = EventData(gson.toJson(it))
                log.debug("Publishing event to EventHub: {}", eventData.bodyAsString)
                if (!eventDataBatch.tryAdd(eventData)) {
                    // if the batch is full, send it and then create a new batch
                    ehClient.send(eventDataBatch)
                    eventDataBatch = ehClient.createBatch()

                    // Try to add that event that couldn't fit before.
                    if (!eventDataBatch.tryAdd(eventData)) {
                        throw IllegalArgumentException(
                            "Event is too large. Max size: ${eventDataBatch.maxSizeInBytes}"
                        )
                    }
                }
            }

        // send the last batch of remaining events
        if (eventDataBatch.count > 0) {
            ehClient.send(eventDataBatch)
        }
    }
}

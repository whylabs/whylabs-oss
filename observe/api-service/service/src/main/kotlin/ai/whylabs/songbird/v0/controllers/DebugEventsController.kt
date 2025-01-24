package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.v0.ddb.DdbUtils.retryWithBackoff
import ai.whylabs.songbird.v0.models.Segment
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.ObjectMapper
import io.micronaut.http.HttpResponse
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject

private const val MaxContentLength = 1000 * 10 // 10 kb

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/debug-events")
@Tag(name = "DebugEvents", description = "Endpoint for debug events")
@Secured(AdministratorRole, UserRole)
class DebugEventsController @Inject constructor(
    private val dataService: DataService,
    private val mapper: ObjectMapper,
) : JsonLogging {

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The resource ID to log the event to
     * @return 202 if the response is accepted
     */
    @Operation(
        operationId = "LogDebugEvent",
        summary = "Log a debug event",
        description =
        """Create a debug event.
        """,
    )
    @Post(
        uri = "/resources/{dataset_id}/debug-events/log",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun log(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body body: DebugEvent,
    ): HttpResponse<String> {
        if (body.content.length > 1000 * 10) {
            return HttpResponse.badRequest("Content length must be less than $MaxContentLength bytes")
        }
        try {
            mapper.readTree(body.content)
        } catch (e: Exception) {
            return HttpResponse.badRequest("Invalid JSON content")
        }
        val msg =
            ai.whylabs.dataservice.model.DebugEvent(body.datasetTimestamp) //
                .orgId(org_id)
                .datasetId(dataset_id)
                .traceId(body.traceId) //
                .segmentTags(
                    body.segment?.tags?.map { s ->
                        ai.whylabs.dataservice.model.SegmentTag().key(s.key).value(s.value)
                    }.orEmpty()
                )
                .content(body.content)
        try {
            retryWithBackoff {
                dataService.debugEventApi.saveDebugEvent(msg)
            }
        } catch (e: Exception) {
            log.error("Failed to save debug event", e)
            return HttpResponse.serverError()
        }

        return HttpResponse.accepted()
    }
}

@Schema(description = "Query debug events")
@JsonInclude(JsonInclude.Include.NON_NULL)
data class DebugEventQuery(
    val traceId: String?,
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val segment: Segment?,
    val tags: List<String>?,
    val jsonPathQuery: String?,
    @field:Schema(required = true, example = "2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z")
    val interval: String,
    val startingOffset: Int?,
)

@Schema(description = "A debug event object")
@JsonInclude(JsonInclude.Include.NON_NULL)
data class DebugEvent(
    val traceId: String?,
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val segment: Segment?,
    val tags: List<String>?,
    val content: String,
    val datasetTimestamp: Long?,
    @field:Schema(accessMode = Schema.AccessMode.READ_ONLY)
    val creationTimestamp: Long?,
)

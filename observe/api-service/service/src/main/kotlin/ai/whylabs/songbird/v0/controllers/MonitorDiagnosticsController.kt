package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.common.WhyLabsHeaders
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.diagnoser.DiagnoserHandler
import ai.whylabs.songbird.monitor.diagnoser.DiagnosisReport
import ai.whylabs.songbird.monitor.diagnostics.AnalyzerSegmentColumnsDiagnosticRequest
import ai.whylabs.songbird.monitor.diagnostics.AnalyzerSegmentColumnsDiagnosticResponse
import ai.whylabs.songbird.monitor.diagnostics.AnalyzerSegmentsDiagnosticRequest
import ai.whylabs.songbird.monitor.diagnostics.AnalyzerSegmentsDiagnosticResponse
import ai.whylabs.songbird.monitor.diagnostics.AnalyzersDiagnosticRequest
import ai.whylabs.songbird.monitor.diagnostics.AnalyzersDiagnosticResponse
import ai.whylabs.songbird.monitor.diagnostics.DataServiceDiagnosticsHandler
import ai.whylabs.songbird.monitor.diagnostics.DiagnosticIntervalRequest
import ai.whylabs.songbird.monitor.diagnostics.DiagnosticIntervalResponse
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DateUtils
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.TimePeriod
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Header
import io.micronaut.http.annotation.Post
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import org.joda.time.Interval

val MAX_DIAGNOSTIC_BATCHES: Long = 100

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/${DocUtils.OrganizationUri}/diagnostics/monitor")
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
@Tags(
    Tag(name = "Monitor Diagnostics", description = "Endpoint for monitor diagnostics"),
)
class MonitorDiagnosticsController @Inject constructor(
    val config: EnvironmentConfig,
    private val modelDAO: ModelDAO,
    private val dataServiceDiagnosticsHandler: DataServiceDiagnosticsHandler,
    private val diagnoserHandler: DiagnoserHandler
) : JsonLogging {

    @Operation(
        operationId = "RecommendDiagnosticInterval",
        summary = "Endpoint to recommend a diagnostic interval",
        description = "Returns an interval containing the last 30 batches of data",
    )
    @Post(
        uri = "/interval",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun diagnosticInterval(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Body request: DiagnosticIntervalRequest
    ): DiagnosticIntervalResponse {
        if (request.batches != null && request.batches > MAX_DIAGNOSTIC_BATCHES) {
            throw IllegalArgumentException("No more than $MAX_DIAGNOSTIC_BATCHES batches are allowed for the diagnostic interval")
        }
        val batches = request.batches ?: 30
        val model = modelDAO.getModel(org_id, request.datasetId)
        return dataServiceDiagnosticsHandler.diagnosticInterval(org_id, request.datasetId, model.timePeriod, batches)
    }

    @Operation(
        operationId = "DetectNoisyAnalyzers",
        summary = "Endpoint to detect noisy or failing analyzers",
        description = "Returns a list of analyzers sorted so the noisiest (most anomalies per column) " +
            "is first. Also includes a similar list for analyzer failures.",
    )
    @Post(
        uri = "/analyzers",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun noisyAnalyzersSummary(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Body body: AnalyzersDiagnosticRequest,
    ): AnalyzersDiagnosticResponse {
        validateInterval(org_id, body.datasetId, Interval.parse(body.interval))
        return dataServiceDiagnosticsHandler.noisyAnalyzersSummary(org_id, body.datasetId, body.interval)
    }

    @Operation(
        operationId = "DetectNoisySegments",
        summary = "Endpoint to detect the noisiest segments for a specific analyzer",
        description = "Returns a list of segments sorted so the noisiest (most anomalies per column) " +
            "is first. Also includes a similar list for segments with analyzer failures.",
    )
    @Post(
        uri = "/analyzer/segments",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun noisySegmentsSummary(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Body body: AnalyzerSegmentsDiagnosticRequest,
    ): AnalyzerSegmentsDiagnosticResponse {
        validateInterval(org_id, body.datasetId, Interval.parse(body.interval))
        return dataServiceDiagnosticsHandler.noisySegmentsSummary(org_id, body.datasetId, body.analyzerId, body.interval)
    }

    @Operation(
        operationId = "DetectNoisyColumns",
        summary = "Endpoint to detect the noisiest columns for a specific analyzer and segment",
        description = "Returns a list of column names sorted so the noisiest (most anomalies) " +
            "is first. Also includes a similar list for columns with analyzer failures.",
    )
    @Post(
        uri = "/analyzer/segment/columns",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun noisyColumnsSummary(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Body body: AnalyzerSegmentColumnsDiagnosticRequest,
    ): AnalyzerSegmentColumnsDiagnosticResponse {
        validateInterval(org_id, body.datasetId, Interval.parse(body.interval))
        return dataServiceDiagnosticsHandler.noisyColumnsSummary(org_id, body.datasetId, body.analyzerId, body.segment, body.interval)
    }

    @Operation(
        operationId = "DiagnoseAnalyzerSync",
        summary = "Endpoint to diagnose a specific analyzer",
        description = "Returns a diagnosis report for a specific analyzer, segment, and interval. Only suitable for small datasets."
    )
    @Post(
        uri = "/diagnose/analyzer/sync",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    fun diagnoseAnalyzer(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Schema(hidden = true) @Header(WhyLabsHeaders.WhyLabsApiKeyHeader) apiKey: String?,
        @Body body: DiagnosisRequest
    ): DiagnosisReport {
        validateInterval(org_id, body.datasetId, Interval.parse(body.interval))
        if (apiKey == null) {
            throw IllegalArgumentException("API key is required")
        }
        return diagnoserHandler.diagnose(org_id, body.datasetId, body.analyzerId, body.segment, body.columns, body.interval, apiKey)
    }

    fun validateInterval(orgId: String, datasetId: String, interval: Interval) {
        val model = modelDAO.getModel(orgId, datasetId)
        val batchUnit = DateUtils.timePeriodToChronoUnit(TimePeriod.valueOf(model.timePeriod.name))
        if (interval.end.toInstant() > DateUtils.getEndTimeForNBatches(interval.start.toInstant(), MAX_DIAGNOSTIC_BATCHES, batchUnit)) {
            throw IllegalArgumentException("Interval end time must be no more than $MAX_DIAGNOSTIC_BATCHES ${batchUnit.toString().lowercase()} from the start time")
        }
    }
}

data class DiagnosisRequest(
    val datasetId: String,
    val analyzerId: String,
    val segment: Segment,
    val interval: String,
    val columns: List<String>
)

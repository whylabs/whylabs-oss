package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.v0.data.AnalysisResultsHandler
import ai.whylabs.songbird.v0.data.AnalysisResultsRequest
import ai.whylabs.songbird.v0.data.AnalysisResultsResponse
import ai.whylabs.songbird.v0.data.MetricTimeseriesRequest
import ai.whylabs.songbird.v0.data.MetricTimeseriesResponse
import ai.whylabs.songbird.v0.data.MetricsTimeseriesHandler
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/dataset/{dataset_id}/data")
@Tags(
    Tag(name = "Data", description = "Endpoint for analysis results and profile data."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class DataController @Inject constructor(
    val config: EnvironmentConfig,
    private val analysisResultsHandler: AnalysisResultsHandler,
    private val metricsTimeseriesHandler: MetricsTimeseriesHandler,
) : JsonLogging {
    @Operation(
        operationId = "AnalysisResultsData",
        summary = "Endpoint to query analysis results for a dataset",
        description = "Returns analysis results for a dataset over a specified interval",
    )
    @Post(
        uri = "/analysis-results",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun queryAnalysisResults(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body request: AnalysisResultsRequest
    ): AnalysisResultsResponse {
        return analysisResultsHandler.queryAnalysisResults(org_id, dataset_id, request)
    }

    @Operation(
        operationId = "MetricTimeseriesData",
        summary = "Endpoint to query a single metric timeseries for a dataset",
        description = "Returns a single column or dataset metric over a specified interval",
    )
    @Post(
        uri = "/metric-timeseries",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun queryMetricTimeseries(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body request: MetricTimeseriesRequest
    ): MetricTimeseriesResponse {
        return metricsTimeseriesHandler.querySingleMetric(org_id, dataset_id, request)
    }
}

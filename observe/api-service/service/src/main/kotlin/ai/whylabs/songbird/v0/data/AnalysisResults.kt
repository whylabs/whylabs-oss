package ai.whylabs.songbird.v0.data

import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.models.Segment
import io.swagger.v3.oas.annotations.media.Schema

data class AnalysisResultsRecord(
    val orgId: String,
    val datasetId: String,
    val column: String,
    val segment: Segment,
    val datasetTimestamp: Long,
    val analyzerId: String,
    val analysisId: String,
    val monitorIds: List<String>?,
    val metric: String?,
    val isAnomaly: Boolean,
    val upperThreshold: Double?,
    val lowerThreshold: Double?,
    val metricValue: Double?,
    val failedAnalysis: Boolean,
    val userMarkedUnhelpful: Boolean,
    val creationTimestamp: Long,
    val targetLevel: String?,
    val analyzerType: String?,
    val algorithm: String?,
    val algorithmMode: String?,
    val failureType: String?,
    val failureExplanation: String?,
)

data class AnalysisResultsRequest(
    @field:Schema(required = true, example = DocUtils.ExampleInterval, description = "Query within this ISO-8601 time period")
    val interval: String,
    val columnNames: List<String>?,
    val metrics: List<String>?,
    val segments: List<Segment>?,
    val analyzerIds: List<String>?,
    val analyzerTypes: List<String>?,
    val monitorIds: List<String>?,
    val includeUnhelpful: Boolean? = false,
    val onlyAnomalies: Boolean? = true,
    val includeFailures: Boolean? = false,
    val offset: Int = 0,
    val limit: Int = 10000,
    val order: SortOrder? = SortOrder.DESC, // usually want most recent first
)

data class AnalysisResultsResponse(
    val results: List<AnalysisResultsRecord>
)

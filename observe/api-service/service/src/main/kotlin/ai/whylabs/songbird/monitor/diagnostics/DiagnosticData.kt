package ai.whylabs.songbird.monitor.diagnostics

import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.TimePeriod
import io.swagger.v3.oas.annotations.media.Schema

data class DiagnosticIntervalRequest(
    val datasetId: String,
    val batches: Int? = null
)

data class DiagnosticIntervalResponse(
    @field:Schema(example = DocUtils.ExampleInterval, description = "Recommended ISO-8601 interval to use for diagnosis", required = true)
    val interval: String,
    @field:Schema(enumAsRef = true)
    val timePeriod: TimePeriod,
    val startTimestamp: Long,
    val endTimestamp: Long
)

data class AnalyzersDiagnosticRequest(
    @field:Schema(example = DocUtils.ExampleInterval, description = "Diagnose within this ISO-8601 time period", required = true)
    val interval: String,
    val datasetId: String
)

data class AnalyzerDiagnosticRecord(
    val analyzerId: String,
    val metric: String,
    val columnCount: Int,
    val segmentCount: Int,
    val anomalyCount: Int,
    val maxAnomalyPerColumn: Int,
    val minAnomalyPerColumn: Int,
    val avgAnomalyPerColumn: Int
)

data class AnalyzerFailureRecord(
    val analyzerId: String,
    val metric: String,
    val columnCount: Int,
    val segmentCount: Int,
    val failedCount: Int,
    val maxFailedPerColumn: Int,
    val minFailedPerColumn: Int,
    val avgFailedPerColumn: Int
)

data class AnalyzersDiagnosticResponse(
    val noisyAnalyzers: List<AnalyzerDiagnosticRecord>,
    val failedAnalyzers: List<AnalyzerFailureRecord>
)

data class AnalyzerSegmentsDiagnosticRequest(
    @field:Schema(example = DocUtils.ExampleInterval, description = "Diagnose within this ISO-8601 time period", required = true)
    val interval: String,
    val datasetId: String,
    val analyzerId: String
)

data class AnalyzerSegmentDiagnosticRecord(
    val segment: Segment,
    val totalAnomalies: Int,
    val batchCount: Int
)

data class AnalyzerSegmentFailureRecord(
    val segment: Segment,
    val totalFailed: Int,
)

data class AnalyzerSegmentsDiagnosticResponse(
    val noisySegments: List<AnalyzerSegmentDiagnosticRecord>,
    val failedSegments: List<AnalyzerSegmentFailureRecord>
)

data class AnalyzerSegmentColumnsDiagnosticRequest(
    @field:Schema(example = DocUtils.ExampleInterval, description = "Diagnose within this ISO-8601 time period", required = true)
    val interval: String,
    val datasetId: String,
    val analyzerId: String,
    val segment: Segment
)

data class AnalyzerSegmentColumnDiagnosticRecord(
    val column: String,
    val totalAnomalies: Int,
    val batchCount: Int
)

data class AnalyzerSegmentColumnsDiagnosticResponse(
    val noisyColumns: List<AnalyzerSegmentColumnDiagnosticRecord>
)

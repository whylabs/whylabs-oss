package ai.whylabs.songbird.monitor.diagnoser
import ai.whylabs.songbird.v0.models.Segment
import io.swagger.v3.oas.annotations.media.Schema

data class ConditionRecord(
    val columns: List<String>?, // not present for some conditions like stale analysis
    val info: Map<String, Any>?,
    val summary: String,
    val name: String
)

data class QualityIssueRecord(
    val name: String,
    val description: String,
    val detectors: List<String>
)

data class ProfileSummary(
    val minRowName: String,
    val minRowCount: Int,
    val maxRowName: String,
    val maxRowCount: Int
)

data class BatchesSummary(
    val minBatchName: String,
    val minBatchCount: Int,
    val maxBatchName: String,
    val maxBatchCount: Int
)

data class ResultRecord(
    val diagnosedColumnCount: Int,
    val batchCount: Int
)

data class NamedCount(
    val name: String,
    val count: Int
)

data class FailureRecord(
    val totalFailuresCount: Int,
    val maxFailuresCount: Int,
    val meanFailuresCount: Int,
    val byColumnCount: List<NamedCount>,
    val byTypeCount: List<NamedCount>
)

data class AnomalyRecord(
    val totalAnomalyCount: Int,
    val maxAnomalyCount: Int,
    val meanAnomalyCount: Int,
    val batchCount: Int,
    val byColumnCount: List<NamedCount>,
    val byColumnBatchCount: List<NamedCount>
)

data class AnalysisResultsSummary(
    val results: ResultRecord,
    val failures: FailureRecord,
    val anomalies: AnomalyRecord
)

data class DiagnosticDataSummary(
    val diagnosticSegment: Segment,
    @field:Schema(nullable = false) // incorrect but needed to generate the python client with a proper type
    val diagnosticProfile: ProfileSummary?,
    @field:Schema(nullable = false) // incorrect but needed to generate the python client with a proper type
    val diagnosticBatches: BatchesSummary?,
    @field:Schema(nullable = false) // incorrect but needed to generate the python client with a proper type
    val analysisResults: AnalysisResultsSummary?,
    val targetedColumnCount: Int
)

data class DiagnosisReport(
    val orgId: String,
    val datasetId: String,
    val analyzerId: String,
    val interval: String,
    val expectedBatchCount: Int,
    val diagnosticData: DiagnosticDataSummary,
    val qualityIssues: List<QualityIssueRecord>,
    val conditions: List<ConditionRecord>,
)

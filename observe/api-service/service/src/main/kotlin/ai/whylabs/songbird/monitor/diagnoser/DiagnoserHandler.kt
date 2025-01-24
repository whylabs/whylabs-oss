package ai.whylabs.songbird.monitor.diagnoser

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.models.Segment
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class DiagnoserHandler @Inject constructor(
    private val diagnoserService: DiagnoserService,
) : JsonLogging {
    fun diagnose(
        orgId: String,
        datasetId: String,
        analyzerId: String,
        segment: Segment,
        columns: List<String>,
        interval: String,
        apiKey: String
    ): DiagnosisReport {
        return diagnoserService.diagnose(
            DiagnoserDiagnosisRequest(
                orgId,
                datasetId,
                analyzerId,
                segment,
                columns,
                interval,
            ),
            apiKey
        )
    }

    fun diagnoseAsync(
        orgId: String,
        datasetId: String,
        analyzerId: String,
        segment: Segment,
        columns: List<String>,
        interval: String,
        apiKey: String
    ): AsyncDiagnosisResponse {
        return diagnoserService.diagnoseAsync(
            DiagnoserDiagnosisRequest(
                orgId,
                datasetId,
                analyzerId,
                segment,
                columns,
                interval,
            ),
            apiKey
        )
    }
    fun diagnosisAsyncResult(
        orgId: String,
        diagnosisId: String,
    ): AsyncDiagnosisResultResponse {
        return diagnoserService.diagnosisAsyncResult(DiagnoserAsyncResultRequest(orgId, diagnosisId))
    }
}

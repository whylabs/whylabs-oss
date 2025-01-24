package ai.whylabs.songbird.v0.data

import ai.whylabs.dataservice.model.AnalyzerResultResponse
import ai.whylabs.dataservice.model.GetAnalyzerResultRequest
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataservice.DataServiceWrapper
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.models.Segment
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class AnalysisResultsHandler @Inject constructor(
    private val dataService: DataService,
) : JsonLogging {
    fun queryAnalysisResults(
        orgId: String,
        datasetId: String,
        request: AnalysisResultsRequest
    ): AnalysisResultsResponse {
        if (request.offset > 100000) {
            throw IllegalArgumentException("Offset cannot exceed 100,000. Please reduce offset and change the interval to retrieve more data.")
        }
        if (request.limit > 10000) {
            throw IllegalArgumentException("Number of records retrieved in one request cannot exceed 10,000. Please reduce limit.")
        }
        val mappedRequest: GetAnalyzerResultRequest = GetAnalyzerResultRequest()
            .orgId(orgId)
            .datasetIds(listOf(datasetId))
            .analyzerIds(request.analyzerIds)
            .analyzerTypes(request.analyzerTypes)
            .monitorIds(request.monitorIds)
            .metrics(request.metrics)
            .columnNames(request.columnNames)
            .segments(request.segments?.map { it.toText() })
            .interval(request.interval)
            .includeFailures(request.includeFailures)
            .onlyAnomalies(request.onlyAnomalies)
            .includeUnhelpful(request.includeUnhelpful)
            .offset(request.offset)
            .limit(request.limit)
            .order(if (request.order == SortOrder.ASC) ai.whylabs.dataservice.model.SortOrder.ASC else ai.whylabs.dataservice.model.SortOrder.DESC)
            .readPgMonitor(true)

        return DataServiceWrapper.tryCall {
            val results: List<AnalyzerResultResponse> = dataService.analysisApi.getAnalyzerResults(mappedRequest)
            val mappedResults = results.map {
                val anomalyCount = it.anomalyCount ?: 0
                val metricThresholds = MetricThresholds.fromAnalysisResult(it)
                AnalysisResultsRecord(
                    orgId = it.orgId ?: "",
                    datasetId = it.datasetId ?: "",
                    analyzerId = it.analyzerId ?: "",
                    column = it.column ?: "",
                    segment = Segment.fromText(it.segment ?: ""),
                    datasetTimestamp = it.datasetTimestamp ?: 0,
                    analysisId = it.analysisId ?: "",
                    monitorIds = it.monitorIds,
                    metric = it.metric,
                    isAnomaly = anomalyCount > 0,
                    upperThreshold = metricThresholds.upperThreshold,
                    lowerThreshold = metricThresholds.lowerThreshold,
                    metricValue = metricThresholds.metricValue,
                    failedAnalysis = it.failureType != null,
                    userMarkedUnhelpful = it.userMarkedUnhelpful ?: false,
                    creationTimestamp = it.creationTimestamp ?: 0,
                    targetLevel = it.targetLevel.toString(), // using dataservice enum causes stack overflow
                    analyzerType = it.analyzerType,
                    algorithm = it.algorithm,
                    algorithmMode = it.algorithmMode,
                    failureType = it.failureType.toString(), // using dataservice enum causes stack overflow
                    failureExplanation = it.failureExplanation,
                )
            }
            AnalysisResultsResponse(results = mappedResults)
        }
    }
}

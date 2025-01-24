package ai.whylabs.songbird.monitor.diagnostics

import ai.whylabs.dataservice.model.DiagnosticAnalyzerSegmentColumnsRequest
import ai.whylabs.dataservice.model.DiagnosticAnalyzerSegmentsRequest
import ai.whylabs.dataservice.model.DiagnosticAnalyzersRequest
import ai.whylabs.dataservice.model.TimeBoundaryQuery
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.truncate
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.TimePeriod
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.joda.time.Instant
import org.joda.time.Interval
import org.joda.time.Period

@Singleton
class DataServiceDiagnosticsHandler @Inject constructor(
    private val dataService: DataService,
) : JsonLogging {
    fun diagnosticInterval(
        orgId: String,
        datasetId: String,
        timePeriod: TimePeriod,
        batches: Int,
    ): DiagnosticIntervalResponse {
        val granularity = timePeriod.toGranularity()
        val data = dataService.profileApi.timeBoundary(TimeBoundaryQuery().orgId(orgId).datasetIds(listOf(datasetId)))
        val boundary = data.rows
            .firstOrNull { it.datasetId == datasetId } ?: throw IllegalArgumentException("No data found for dataset $datasetId")
        val end = boundary.end.truncate(granularity)
        val period = Period.parse(timePeriod.toString()).multipliedBy(batches)
        val interval = Interval(period, Instant(end))
        return DiagnosticIntervalResponse(
            interval = interval.toString(),
            timePeriod = timePeriod,
            startTimestamp = boundary.start,
            endTimestamp = boundary.end,
        )
    }

    fun noisyAnalyzersSummary(
        orgId: String,
        datasetId: String,
        interval: String
    ): AnalyzersDiagnosticResponse {
        val request = DiagnosticAnalyzersRequest()
            .orgId(orgId)
            .datasetId(datasetId)
            .interval(interval)

        val res = dataService.diagnosticApi.findBadAnalyzers(request)
        return AnalyzersDiagnosticResponse(
            noisyAnalyzers = res.noisyAnalyzers.map {
                AnalyzerDiagnosticRecord(
                    analyzerId = it.analyzerId, metric = it.metric, columnCount = it.columnCount,
                    segmentCount = it.segmentCount, anomalyCount = it.anomalyCount,
                    maxAnomalyPerColumn = it.maxAnomalyPerColumn, minAnomalyPerColumn = it.minAnomalyPerColumn,
                    avgAnomalyPerColumn = it.avgAnomalyPerColumn
                )
            },
            failedAnalyzers = res.failedAnalyzers.map {
                AnalyzerFailureRecord(
                    analyzerId = it.analyzerId,
                    metric = it.metric, columnCount = it.columnCount, segmentCount = it.segmentCount,
                    failedCount = it.failedCount, maxFailedPerColumn = it.maxFailedPerColumn,
                    minFailedPerColumn = it.minFailedPerColumn, avgFailedPerColumn = it.avgFailedPerColumn
                )
            }
        )
    }

    fun noisySegmentsSummary(
        orgId: String,
        datasetId: String,
        analyzerId: String,
        interval: String
    ): AnalyzerSegmentsDiagnosticResponse {
        val request = DiagnosticAnalyzerSegmentsRequest()
            .orgId(orgId)
            .datasetId(datasetId)
            .analyzerId(analyzerId)
            .interval(interval)
        val res = dataService.diagnosticApi.diagnoseAnalyzerSegments(request)
        return AnalyzerSegmentsDiagnosticResponse(
            noisySegments = res.noisySegments.map {
                AnalyzerSegmentDiagnosticRecord(segment = Segment.fromText(it.segment), totalAnomalies = it.totalAnomalies, batchCount = it.batchCount)
            },
            failedSegments = res.failedSegments.map {
                AnalyzerSegmentFailureRecord(segment = Segment.fromText(it.segment), totalFailed = it.totalFailed)
            }
        )
    }

    fun noisyColumnsSummary(
        orgId: String,
        datasetId: String,
        analyzerId: String,
        segment: Segment,
        interval: String
    ): AnalyzerSegmentColumnsDiagnosticResponse {
        val request = DiagnosticAnalyzerSegmentColumnsRequest()
            .orgId(orgId)
            .datasetId(datasetId)
            .analyzerId(analyzerId)
            .segment(segment.toText())
            .interval(interval)

        val res = dataService.diagnosticApi.diagnoseAnalyzerSegmentColumns(request)
        return AnalyzerSegmentColumnsDiagnosticResponse(
            noisyColumns = res.noisyColumns.map {
                AnalyzerSegmentColumnDiagnosticRecord(
                    column = it.column, totalAnomalies = it.totalAnomalies,
                    batchCount = it.batchCount
                )
            }
        )
    }
}

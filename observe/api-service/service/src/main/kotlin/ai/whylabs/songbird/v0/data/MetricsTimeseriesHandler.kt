package ai.whylabs.songbird.v0.data

import ai.whylabs.dataservice.model.DataGranularity
import ai.whylabs.dataservice.model.TimeSeriesQueryRequest
import ai.whylabs.dataservice.model.TimeSeriesQueryResponse
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataservice.DataServiceWrapper
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.v0.models.Segment
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.joda.time.Interval

@Singleton
class MetricsTimeseriesHandler @Inject constructor(
    private val dataService: DataService,
) : JsonLogging {
    fun querySingleMetric(
        orgId: String,
        datasetId: String,
        request: MetricTimeseriesRequest
    ): MetricTimeseriesResponse {
        val interval = Interval.parse(request.interval)
        if (interval.toDuration().standardDays > 90) {
            throw IllegalArgumentException("Interval must be less than or equal to 90 days")
        }
        if (request.granularity !in allowedRollupGranularity) {
            throw IllegalArgumentException("Granularity must be one of $allowedRollupGranularity")
        }
        val queryId = "q1"

        // Nasty forced workaround for handling union types
        val query = TimeSeriesOverrideQuery().metric(request.metric)
        query.queryId(queryId)
        query.resourceId(datasetId)
        query.columnName(request.column)
        if (request.analyzerId != null) {
            query.analyzerId(request.analyzerId)
        }
        if (request.monitorId != null) {
            query.monitorId(request.monitorId)
        }
        if (request.segment !== null) {
            query.segment(request.segment.tags.map { ai.whylabs.dataservice.model.SegmentTag().key(it.key).value(it.value) })
        }
        val mappedRequest = TimeSeriesQueryRequest().timeseries(listOf(query))
            .interval(request.interval)
            .rollupGranularity(DataGranularity.valueOf((request.granularity ?: Granularity.DAILY).name))
        // End code implementing nasty workaround
        return DataServiceWrapper.tryCall {
            val response: TimeSeriesQueryResponse = dataService.metricsApi.timeseries(orgId, mappedRequest)
            val results = response.timeseries?.firstOrNull { it.id == queryId }
            val mappedData = results?.data?.map {
                // adjust timestamp for granularity ALL because otherwise its an unrelated fixed timestamp
                val ts = if (request.granularity == Granularity.ALL) results.startTime else it.timestamp
                MetricTimeseriesRecord(
                    timestamp = ts ?: 0,
                    lastModified = it.lastModified,
                    value = if (it.value?.isNaN() == true) null else it.value,
                )
            }
            MetricTimeseriesResponse(data = mappedData ?: emptyList())
        }
    }
}

data class MetricTimeseriesRequest(
    @field:Schema(required = true, example = DocUtils.ExampleInterval, description = "Query within this ISO-8601 time period")
    val interval: String,
    val column: String?,
    val metric: String,
    val segment: Segment?,
    @field:Schema(description = "Analyzer ID, optional and only used for monitor metrics like anomaly_count")
    val analyzerId: String?,
    @field:Schema(description = "Monitor ID, optional and only used for monitor metrics like anomaly_count")
    val monitorId: String?,
    val granularity: Granularity? = Granularity.DAILY,
)

data class MetricTimeseriesRecord(
    val timestamp: Long,
    val lastModified: Long?,
    val value: Double?,
)

data class MetricTimeseriesResponse(
    val data: List<MetricTimeseriesRecord>
)

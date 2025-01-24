package ai.whylabs.songbird.v0.data

import ai.whylabs.dataservice.model.TimeSeriesQuery
import com.google.gson.annotations.SerializedName
import io.swagger.v3.oas.annotations.media.Schema
import java.util.Objects
import javax.annotation.Nonnull

/*
 * This exists to work-around problems with the data service client and union types
 */
class TimeSeriesOverrideQuery : TimeSeriesQuery() {
    @get:Schema
    @get:Nonnull
    @SerializedName("metric")
    var metric: String? = null
    @get:Schema
    @SerializedName("analyzerId")
    var analyzerId: String? = null
    @get:Schema
    @SerializedName("monitorId")
    var monitorId: String? = null
    @get:Schema
    @get:Nonnull
    @SerializedName("datasource")
    var datasource: String? = null

    fun metric(metric: String?): TimeSeriesOverrideQuery {
        this.metric = metric
        this.datasource = if (validMonitorMetrics.contains(metric?.lowercase())) "monitors" else "profiles"
        return this
    }

    fun analyzerId(analyzerId: String?): TimeSeriesOverrideQuery {
        this.analyzerId = analyzerId
        return this
    }

    fun monitorId(monitorId: String?): TimeSeriesOverrideQuery {
        this.monitorId = monitorId
        return this
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) {
            return true
        } else if (other != null && this.javaClass == other.javaClass) {
            val timeSeriesQuery = other as TimeSeriesOverrideQuery
            return this.segment == timeSeriesQuery.segment && (this.queryId == timeSeriesQuery.queryId) &&
                (this.resourceId == timeSeriesQuery.resourceId) && (this.columnName == timeSeriesQuery.columnName) &&
                (this.metric == timeSeriesQuery.metric) && (this.analyzerId == timeSeriesQuery.analyzerId) &&
                (this.monitorId == timeSeriesQuery.monitorId)
        } else {
            return false
        }
    }

    override fun hashCode(): Int {
        return Objects.hash(*arrayOf(this.segment, this.queryId, this.resourceId, this.columnName, this.metric, this.analyzerId, this.monitorId))
    }

    override fun toString(): String {
        val sb = StringBuilder()
        sb.append("class TimeSeriesOverrideQuery {\n")
        sb.append("    segment: ").append(this.toIndentedString(this.segment)).append("\n")
        sb.append("    queryId: ").append(this.toIndentedString(this.queryId)).append("\n")
        sb.append("    resourceId: ").append(this.toIndentedString(this.resourceId)).append("\n")
        sb.append("    columnName: ").append(this.toIndentedString(this.columnName)).append("\n")
        sb.append("    metric: ").append(this.toIndentedString(this.metric)).append("\n")
        sb.append("    analyzerId: ").append(this.toIndentedString(this.analyzerId)).append("\n")
        sb.append("    monitorId: ").append(this.toIndentedString(this.monitorId)).append("]\n")
        sb.append("}")
        return sb.toString()
    }

    private fun toIndentedString(o: Any?): String {
        return o?.toString()?.replace("\n", "\n    ") ?: "null"
    }
}

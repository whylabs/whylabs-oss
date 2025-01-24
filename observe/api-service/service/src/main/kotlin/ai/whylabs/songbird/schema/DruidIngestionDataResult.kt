package ai.whylabs.songbird.schema

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "metricType",
    defaultImpl = GenericDataResult::class
)
@JsonSubTypes(
    JsonSubTypes.Type(value = DruidIngestionDataResult::class, name = "STREAMING_INGESTION")
)
abstract class RecordDataResult {
    val metricType: String? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
class GenericDataResult : RecordDataResult()

data class DruidIngestionDataResult(
    val orgId: String,
    val datasetId: String,
    @JsonProperty("ts")
    val timestamp: Long,
    @JsonProperty("datasetTs")
    val datasetTimestamp: Long,
    val file: String,
    val columnMetadata: Map<String, DruidIngestionSchemaInfo>
) : RecordDataResult() {
    internal fun toEntitySchema(): EntitySchema {
        val cols = columnMetadata.mapValues { it.value.toColumnSchema() }
        return EntitySchema(cols)
    }
}

data class DruidIngestionSchemaInfo(
    val type: String?,
    val discrete: Boolean?,
    val direction: String?,
    val tags: List<String>?
) {
    internal fun toColumnSchema(): ColumnSchema {
        val discreteness: String = if (discrete == false) "continuous" else "discrete"
        val dataType: String = if (type.equals("boolean", ignoreCase = true)) {
            "bool"
        } else {
            type?.lowercase() ?: "unknown"
        }
        return ColumnSchema(direction?.lowercase() ?: "input", dataType, discreteness, tags)
    }
}

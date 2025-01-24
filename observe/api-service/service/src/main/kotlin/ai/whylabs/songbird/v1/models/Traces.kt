package ai.whylabs.songbird.v1.models

import ai.whylabs.songbird.logging.JsonLogging
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.google.protobuf.ByteString
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
import io.opentelemetry.proto.common.v1.AnyValue
import io.opentelemetry.proto.common.v1.KeyValue
import io.swagger.v3.oas.annotations.media.Schema
import javax.xml.bind.DatatypeConverter

private const val DatasetIdAttr = "whylabs.dataset_id"
private const val ResourceIdAttr = "whylabs.resource_id"
private const val WhyLabsTags = "whylabs.tags"

enum class RejectReason {
    MissingResourceId,
}

private val SpecialTagGroups = listOf(
    "langkit.metrics",
    "whylabs.secure.action",
    "whylabs.secure.additional_data",
    "whylabs.secure.metadata",
    "whylabs.secure.metrics",
    "whylabs.secure.latency",
    "whylabs.secure.score_latency",
    "whylabs.secure.policy",
    "whylabs.secure.score",
)

object Tracing : JsonLogging {

    /**
     * Represents a row of Span in our database.
     * Why PascalCase? We are following convention in Clickhouse and Azure Data exporter:
     * See: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/00ee7cb8a0ad74a9ff75189ffacf9335eed60c82/exporter/clickhouseexporter/exporter_traces.go#L161
     * See: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/00ee7cb8a0ad74a9ff75189ffacf9335eed60c82/exporter/azuredataexplorerexporter/tracesdata_to_adx.go#L15
     */
    @Suppress("PropertyName")
    data class Span(
        val OrgId: String?,
        val ResourceId: String?,
        val TraceId: String?,
        val SpanId: String?,
        val ParentId: String?,
        val SpanName: String?,
        val SpanStatus: String?,
        val SpanStatusMessage: String?,
        val SpanKind: String?,
        val StartTime: Long?,
        val EndTime: Long?,
        val ResourceAttributes: Map<String, Any?>?,
        val TraceAttributes: Map<String, Any?>?,
        val Events: List<Event>?,
        val Links: List<Link>?,
        val Tags: List<String>,
    )

    @Suppress("PropertyName")
    data class Event(
        val EventName: String?,
        val Timestamp: Long,
        val EventAttributes: Map<String, Any?>
    )

    @Suppress("PropertyName")
    data class Link(
        val TraceId: String?,
        val SpanId: String?,
        val TraceState: String?,
        val SpanLinkAttributes: Map<String, Any?>
    )

    private fun keyValuesToMap(pairs: List<KeyValue>): Map<String, Any?> {
        return pairs.associate { kv ->
            (kv.key to toValue(kv.value))
        }
    }

    private fun ByteString.toHexString(): String {
        val ba = this.toByteArray()
        if (ba == null || ba.isEmpty()) {
            return ""
        }
        return DatatypeConverter.printHexBinary(ba).lowercase()
    }

    fun toSpans(
        orgId: String,
        overrideResourceId: String?,
        traceRequest: ExportTraceServiceRequest,
        rejectCounter: RejectCounter
    ): List<Span> {
        return traceRequest.resourceSpansList //
            .flatMap { rs ->
                val resourceAttributes = keyValuesToMap(rs.resource.attributesList).toMutableMap()
                val resourceId = resourceAttributes.remove(ResourceIdAttr) as String? ?: overrideResourceId
                /**
                 * TODO: We need to decide if we want to reject spans without resource ID.
                 if (resourceId === null) {
                 rejectCounter.increment(rs.scopeSpansList.size, RejectReason.MissingResourceId)
                 return emptyList()
                 }
                 **/
                rs.scopeSpansList //
                    .flatMap { it.spansList } //
                    .map {
                        toSpanEntry(orgId, resourceId, resourceAttributes, it)
                    }
            }
    }

    private fun toSpanEntry(
        orgId: String,
        resourceId: String?,
        resourceAttributes: Map<String, Any?>,
        otelSpan: io.opentelemetry.proto.trace.v1.Span
    ): Span {
        val attrs = keyValuesToMap(otelSpan.attributesList).toMutableMap()
        val overrideResourceId = attrs.remove(DatasetIdAttr) as String? ?: resourceId

        // move everything prefixed with langkit.metrics into a nested object
        for (tagGroup in SpecialTagGroups) {
            extractMetricGroups(tagGroup, attrs)
        }

        val tags = (attrs.remove(WhyLabsTags) as List<*>?)?.mapNotNull {
            when (it) {
                is String -> it
                is ByteString -> it.toStringUtf8()
                else -> null
            }
        }
            ?: emptyList()

        return Span(
            OrgId = orgId,
            ResourceId = overrideResourceId,
            TraceId = otelSpan.traceId.toHexString(),
            SpanId = otelSpan.spanId.toHexString(),
            ParentId = otelSpan.parentSpanId.toHexString(),
            SpanName = otelSpan.name,
            SpanStatus = otelSpan.status.code.name,
            SpanStatusMessage = otelSpan.status.message,
            SpanKind = otelSpan.kind.name,
            StartTime = otelSpan.startTimeUnixNano,
            EndTime = otelSpan.endTimeUnixNano,
            ResourceAttributes = resourceAttributes,
            TraceAttributes = attrs,
            Events = otelSpan.eventsList.map { e ->
                Event(
                    EventName = e.name,
                    Timestamp = e.timeUnixNano,
                    EventAttributes = keyValuesToMap(e.attributesList),
                )
            },
            Links = otelSpan.linksList.map { l ->
                Link(
                    TraceId = l.traceId.toHexString(),
                    SpanId = l.spanId.toHexString(),
                    TraceState = l.traceState,
                    SpanLinkAttributes = keyValuesToMap(l.attributesList),
                )
            },
            Tags = tags,
        )
    }

    /**
     * Extracts all attributes that start with the given tagGroup and moves them into a nested object.
     */
    private fun extractMetricGroups(tagGroup: String, attrs: MutableMap<String, Any?>) {
        val filterAttrs = mutableMapOf<String, Any?>()
        val groupPrefix = "$tagGroup."
        for (key in attrs.keys.toMutableSet()) {
            if (key.startsWith(groupPrefix) && key.length > groupPrefix.length) {
                var value = attrs.remove(key)
                value = parseNestedValue(value)
                filterAttrs[key.substring(groupPrefix.length)] = value
            }
        }

        if (filterAttrs.isNotEmpty()) {
            attrs[tagGroup] = filterAttrs
        }
    }

    private fun parseNestedValue(value: Any?): Any? {
        val objectMapper = jacksonObjectMapper()
        if (value !is String) return value

        if (!value.trim().startsWith("{") && !value.trim().startsWith("[")) {
            return value
        }

        return try {
            when (val parsedValue: Any = objectMapper.readValue(value, object : TypeReference<Any>() {})) {
                is List<*> -> {
                    parsedValue.map { parseNestedValue(it) }
                }

                is Map<*, *> -> {
                    parsedValue.mapValues { parseNestedValue(it.value) }
                }

                else -> {
                    parsedValue
                }
            }
        } catch (e: Exception) {
            log.error("Failed to parse nested structure: $value", e)
            value
        }
    }

    private fun toValue(value: AnyValue): Any? {
        when (value.valueCase) {
            AnyValue.ValueCase.STRING_VALUE -> return value.stringValue
            AnyValue.ValueCase.INT_VALUE -> return value.intValue
            AnyValue.ValueCase.BOOL_VALUE -> return value.boolValue
            AnyValue.ValueCase.DOUBLE_VALUE -> return value.doubleValue
            AnyValue.ValueCase.BYTES_VALUE -> return value.bytesValue.toByteArray()
            AnyValue.ValueCase.ARRAY_VALUE -> return value.arrayValue.valuesList.map { toValue(it) }
            AnyValue.ValueCase.KVLIST_VALUE -> return keyValuesToMap(value.kvlistValue.valuesList)
            AnyValue.ValueCase.VALUE_NOT_SET -> return null
            else -> {
                log.error("Unknown value type - this is likely due to a protobuf format change: ${value.valueCase}")
                return null
            }
        }
    }
}

@Schema(description = "Export Trace Service Response")
data class ExportTraceServiceResponse(
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val partialSuccess: ExportTracePartialSuccess?
)

data class ExportTracePartialSuccess(
    val rejectedSpans: Long = 0,
    val errorMessage: String?
)

data class RejectCounter(var count: Long, val reasons: MutableSet<RejectReason>) {
    companion object {
        fun initial() = RejectCounter(0, mutableSetOf())
    }

    fun increment(n: Int, reason: RejectReason? = null) {
        count += n
        reason?.apply { reasons.add(this) }
    }

    fun errorMessage(): String? {
        return if (reasons.isEmpty()) {
            null
        } else {
            reasons.map { it.name }.sortedDescending().joinToString(",")
        }
    }
}

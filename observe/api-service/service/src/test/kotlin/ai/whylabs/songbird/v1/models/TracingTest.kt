package ai.whylabs.songbird.v1.models

import com.google.gson.Gson
import com.google.protobuf.ByteString
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest
import io.opentelemetry.proto.common.v1.AnyValue
import io.opentelemetry.proto.common.v1.ArrayValue
import io.opentelemetry.proto.common.v1.KeyValue
import io.opentelemetry.proto.resource.v1.Resource
import io.opentelemetry.proto.trace.v1.ResourceSpans
import io.opentelemetry.proto.trace.v1.ScopeSpans
import io.opentelemetry.proto.trace.v1.Span
import io.opentelemetry.proto.trace.v1.Status
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.Duration
import java.time.Instant

class TracingTest {
    private val gson = Gson()

    /**
     * Spans are deep objects and the default equals() only does a shallow comparison.
     * It's easier to use Gson to turn it to a tree and compare the tree
     */
    private fun compareSpans(expected: Tracing.Span, actual: Tracing.Span) {
        val ex = gson.toJsonTree(expected)
        val ac = gson.toJsonTree(actual)
        assertEquals(
            ex, ac
        )
    }

    @Test
    fun convert_Valid_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano
        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
                .addAttributes(
                    KeyValue.newBuilder().setKey("traceAttribKey")
                        .setValue(AnyValue.newBuilder().setStringValue("traceAttribVal"))
                )
                .addAttributes(
                    KeyValue.newBuilder().setKey("langkit.metrics.pii")
                        .setValue(AnyValue.newBuilder().setDoubleValue(1.0))
                )
                .addAttributes(
                    KeyValue.newBuilder().setKey("langkit.metrics.data_leakeage")
                        .setValue(AnyValue.newBuilder().setDoubleValue(0.5))
                )
        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val span = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_SERVER",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            TraceAttributes = mapOf(
                "traceAttribKey" to "traceAttribVal",
                "langkit.metrics" to mapOf("pii" to 1.0, "data_leakeage" to 0.5)
            ),
            Events = listOf(),
            Links = listOf(),
            Tags = listOf(),
        )
        compareSpans(
            expected, span
        )
    }

    @Test
    fun convert_NoData_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano
        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_UNSPECIFIED)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val span = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_UNSPECIFIED",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            TraceAttributes = mapOf(),
            Events = listOf(),
            Links = listOf(),
            Tags = listOf(),
        )
        compareSpans(
            expected, span
        )
    }

    @Test
    fun convert_WithLinks_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano
        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
                .addAttributes(
                    KeyValue.newBuilder().setKey("traceAttribKey")
                        .setValue(AnyValue.newBuilder().setStringValue("traceAttribVal"))
                )
                .addLinks(Span.Link.newBuilder().setSpanId(spanId).setTraceId(traceId).setTraceState(""))
        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val span = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_SERVER",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            TraceAttributes = mapOf("traceAttribKey" to "traceAttribVal"),
            Events = listOf(),
            Links = listOf(
                Tracing.Link(
                    TraceId = "00000000000000000000000000000064",
                    SpanId = "0000000000000032",
                    TraceState = "",
                    SpanLinkAttributes = mapOf(),
                )
            ),
            Tags = listOf(),
        )
        compareSpans(
            expected, span
        )
    }

    @Test
    fun convert_WithEvents_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano
        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
                .addAttributes(
                    KeyValue.newBuilder().setKey("traceAttribKey")
                        .setValue(AnyValue.newBuilder().setStringValue("traceAttribVal"))
                )
                .addLinks(Span.Link.newBuilder().setSpanId(spanId).setTraceId(traceId).setTraceState(""))
                .addEvents(
                    Span.Event.newBuilder().setName("eventname").setTimeUnixNano(ts) //
                        .addAttributes(
                            KeyValue.newBuilder().setKey("eventkey")
                                .setValue(AnyValue.newBuilder().setStringValue("eventvalue"))
                        )
                        .addAttributes(
                            KeyValue.newBuilder().setKey("intKey")
                                .setValue(AnyValue.newBuilder().setIntValue(1))
                        )
                        .addAttributes(
                            KeyValue.newBuilder().setKey("doubleKey")
                                .setValue(AnyValue.newBuilder().setDoubleValue(2.0))
                        )
                        .addAttributes(
                            KeyValue.newBuilder().setKey("boolKey")
                                .setValue(AnyValue.newBuilder().setBoolValue(false))
                        )
                        // TODO: add byte attribute as well. The test fails due to byte comparison
                        .addAttributes(
                            KeyValue.newBuilder().setKey("eventListKey")
                                .setValue(
                                    AnyValue.newBuilder().setArrayValue(
                                        ArrayValue.newBuilder().addValues(
                                            AnyValue.newBuilder().setStringValue("v1")
                                        ).addValues(
                                            AnyValue.newBuilder().setStringValue("v2")
                                        )
                                    )
                                )
                        )

                )
        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val actual = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_SERVER",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            TraceAttributes = mapOf("traceAttribKey" to "traceAttribVal"),
            Events = listOf(
                Tracing.Event(
                    EventName = "eventname",
                    Timestamp = ts,
                    EventAttributes = mapOf(
                        "eventkey" to "eventvalue",
                        "intKey" to 1,
                        "doubleKey" to 2.0,
                        "boolKey" to false,
                        "eventListKey" to listOf("v1", "v2"),
                    ),
                )
            ),
            Links = listOf(
                Tracing.Link(
                    TraceId = "00000000000000000000000000000064",
                    SpanId = "0000000000000032",
                    TraceState = "",
                    SpanLinkAttributes = mapOf(),
                )
            ),
            Tags = listOf(),
        )
        compareSpans(expected, actual)
    }

    @Test
    fun convert_WithTags_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano
        val hallucinationValue = AnyValue.newBuilder()
            .setArrayValue(
                ArrayValue.newBuilder().addValues(AnyValue.newBuilder().setStringValue("langkit:hallucination"))
            )
        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
                .addAttributes(
                    KeyValue.newBuilder().setKey("traceAttribKey")
                        .setValue(AnyValue.newBuilder().setStringValue("traceAttribVal"))
                )
                .addAttributes(
                    KeyValue.newBuilder().setKey("whylabs.tags")
                        .setValue(hallucinationValue)
                )
        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val actual = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_SERVER",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            // Note: the tags don't show up here again since we already moved it to the top level
            TraceAttributes = mapOf("traceAttribKey" to "traceAttribVal"),
            Events = listOf(),
            Links = listOf(),
            Tags = listOf("langkit:hallucination"),
        )
        compareSpans(expected, actual)
    }

    @Test
    fun convert_WithNeighborIds_to_Spans() {
        val traceId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100))
        val spanId = ByteString.copyFrom(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 50))
        val instant = Instant.ofEpochMilli(1672531200000)

        val ts = instant.epochSecond * Duration.ofSeconds(1).toNanos() + instant.nano

        val req = exportTraceServiceRequest(
            Span.newBuilder() //
                .setName("spanname")
                .setSpanId(spanId)
                .setTraceId(traceId)
                .setKind(Span.SpanKind.SPAN_KIND_SERVER)
                .setStartTimeUnixNano(ts)
                .setEndTimeUnixNano(ts)
                .setStatus(Status.newBuilder().setCode(Status.StatusCode.STATUS_CODE_UNSET))
                .addAttributes(
                    KeyValue.newBuilder().setKey("traceAttribKey")
                        .setValue(AnyValue.newBuilder().setStringValue("traceAttribVal"))
                )
                .addAttributes(
                    KeyValue.newBuilder().setKey("neighborIds")
                        .setValue(
                            AnyValue.newBuilder().setArrayValue(
                                ArrayValue.newBuilder().addValues(AnyValue.newBuilder().setStringValue("neighbor1"))
                                    .addValues(AnyValue.newBuilder().setStringValue("neighbor2"))
                            )
                        )
                )
                .addAttributes(
                    KeyValue.newBuilder().setKey("whylabs.secure.metrics.nestedMetric")
                        .setValue(
                            AnyValue.newBuilder().setArrayValue(
                                ArrayValue.newBuilder().addValues(
                                    AnyValue.newBuilder().setArrayValue(
                                        ArrayValue.newBuilder().addValues(
                                            AnyValue.newBuilder().setStringValue("nestedValue1")
                                        ).addValues(
                                            AnyValue.newBuilder().setStringValue("nestedValue2")
                                        )
                                    )
                                )
                            )
                        )
                )

        )

        val res = Tracing.toSpans("org", "resource", req, RejectCounter.initial()).toList()
        assertEquals(1, res.size, "Should have 1 span")
        val actual = res[0]
        val expected = Tracing.Span(
            OrgId = "org",
            ResourceId = "resource",
            TraceId = "00000000000000000000000000000064",
            SpanId = "0000000000000032",
            ParentId = "",
            SpanName = "spanname",
            SpanStatus = "STATUS_CODE_UNSET",
            SpanStatusMessage = "",
            SpanKind = "SPAN_KIND_SERVER",
            StartTime = ts,
            EndTime = ts,
            ResourceAttributes = mapOf("service" to "test"),
            TraceAttributes = mapOf(
                "traceAttribKey" to "traceAttribVal",
                "whylabs.secure.metrics" to mapOf("nestedMetric" to listOf(listOf("nestedValue1", "nestedValue2"))),
                "neighborIds" to listOf("neighbor1", "neighbor2")
            ),
            Events = listOf(),
            Links = listOf(),
            Tags = listOf(),
        )
        compareSpans(expected, actual)
    }

    private fun exportTraceServiceRequest(span: Span.Builder): ExportTraceServiceRequest {
        return ExportTraceServiceRequest.newBuilder()
            .addResourceSpans(
                ResourceSpans.newBuilder()
                    .setResource(
                        Resource.newBuilder()
                            .addAttributes(
                                KeyValue.newBuilder().setKey("service")
                                    .setValue(AnyValue.newBuilder().setStringValue("test"))
                            )
                    )
                    .addScopeSpans(
                        ScopeSpans.newBuilder()
                            .addSpans(
                                span
                            )
                    )
            )
            .build()
    }
}

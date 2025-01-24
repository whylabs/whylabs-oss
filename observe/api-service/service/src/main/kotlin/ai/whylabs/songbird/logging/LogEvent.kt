package ai.whylabs.songbird.logging

import ai.whylabs.songbird.operations.getCurrentRequestId
import ai.whylabs.songbird.operations.getValidatedIdentity
import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.databind.SerializerProvider
import com.fasterxml.jackson.databind.annotation.JsonSerialize
import com.fasterxml.jackson.databind.ser.std.StdSerializer
import org.apache.logging.log4j.Marker
import org.apache.logging.log4j.message.ObjectMessage

/**
 * An object that can be serialized by Jackson for readability
 */
@JsonSerialize(using = LogEventSerializer::class)
data class LogEvent(
    internal val contentSupplier: () -> Any,
    internal val metadata: Map<String, String?> = emptyMap(),
) {
    fun toMessage(): ObjectMessage {
        return ObjectMessage(this)
    }

    override fun toString(): String {
        val msg = contentSupplier.invoke().toString()
        return "$msg, meta=$metadata"
    }
}

private const val ContentField = "content"

class LogEventSerializer : StdSerializer<LogEvent>(LogEvent::class.java) {
    override fun serialize(event: LogEvent, gen: JsonGenerator, provider: SerializerProvider) {
        gen.writeStartObject()
        val content = event.contentSupplier.invoke()
        if (content is String) {
            gen.writeStringField(ContentField, content)
        } else {
            gen.writeObjectField(ContentField, content)
        }
        event.metadata.forEach { (field, value) ->
            if (field != ContentField && value != null) {
                gen.writeStringField(field, value)
            }
        }
        gen.writeEndObject()
    }
}

class LogEventProps(
    private var msg: () -> Any = { },
    private val meta: MutableMap<String, String?> = mutableMapOf(),
    var marker: Marker? = null,
    var e: Throwable? = null,
) {
    fun toMessage(): ObjectMessage {
        getCurrentRequestId()?.also { meta["requestId"] = it }
        getValidatedIdentity()?.also {
            meta["orgId"] = it.orgId
            meta["keyId"] = it.identityId
            meta["userId"] = it.principalId
        }

        return LogEvent(msg, meta).toMessage()
    }

    fun msg(supplier: () -> Any) {
        this.msg = supplier
    }

    fun msg(message: String) {
        this.msg = { message }
    }

    fun meta(vararg meta: Pair<String, String?>) {
        this.meta.putAll(mapOf(*meta))
    }

    fun exception(exception: Throwable) {
        this.e = exception
    }
}

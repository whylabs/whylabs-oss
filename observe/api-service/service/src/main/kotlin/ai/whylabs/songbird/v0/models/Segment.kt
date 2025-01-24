package ai.whylabs.songbird.v0.models

import ai.whylabs.dataservice.model.Tag
import ai.whylabs.songbird.util.Jackson
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTypeConverter
import com.google.gson.GsonBuilder
import io.micronaut.core.convert.ConversionContext
import io.micronaut.core.convert.TypeConverter
import io.micronaut.core.convert.format.Format
import io.micronaut.core.convert.format.FormattingTypeConverter
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Singleton
import java.util.Optional
import javax.validation.constraints.NotBlank

// A lenient json serializer/deserializer since the Python client
// sends JSON with single quotes instead of double quotes
private val Gson = GsonBuilder().setLenient().create()

@Schema(description = "A key value tag")
data class SegmentTag(
    @field:NotBlank val key: String,
    @field:NotBlank val value: String,
) {
    companion object {
        // super ugly code, but the OpenAPI client applies Java/Kotlin serialization
        // on the object before sending them over the wire. This means we can't properly decode them
        // from the query string. This is a hackaround that and is very fragile
        private val JavaRegex = Regex("class SegmentTag \\{\\n[ ]+key: (.+)\\n[ ]+value: (.+)\\n}")
        private val KotlinRegex = Regex("SegmentTag\\(key=(.+), value=(.+)\\)")

        fun fromString(text: String): SegmentTag {
            when {
                text.startsWith("{") -> {
                    return try {
                        Gson.fromJson(text, SegmentTag::class.java)
                    } catch (e: Exception) {
                        throw IllegalArgumentException("Failed to parse SegmentTag. Input: $text")
                    }
                }
                text.startsWith("c") -> { // class SegmentTag ...
                    val javaMatch = JavaRegex.matchEntire(text)
                    if (javaMatch != null) {
                        val (key, value) = javaMatch.destructured
                        return SegmentTag(key, value)
                    }
                }
                text.startsWith("S") -> { // SegmentTag(...)
                    val kotlinMatch = KotlinRegex.matchEntire(text)
                    if (kotlinMatch != null) {
                        val (key, value) = kotlinMatch.destructured
                        return SegmentTag(key, value)
                    }
                }
            }
            throw IllegalArgumentException("Failed to parse SegmentTag. Input: $text")
        }
    }
}

data class Segment(val tags: List<SegmentTag> = emptyList()) {
    constructor(vararg tags: SegmentTag) : this(tags.toList().sortedBy { it.key })

    fun normalize(): Segment {
        return Segment(tags.sortedBy { it.key }.distinctBy { it.key })
    }

    override fun toString(): String {
        return Gson.toJson(this.normalize())
    }

    fun toDataServiceSegmentTags(): List<Tag> {
        return tags.map { it.toDataServiceTag() }
    }

    private fun SegmentTag.toDataServiceTag(): Tag {
        return Tag().key(key).value(value)
    }

    /**
     * Return a compact normalized JSON string that can be used to represent the segments
     */
    fun toCompactJsonString(): String {
        val normalized = this.normalize()
        val arrayNode = Jackson.array()
        normalized.tags.map { t -> Jackson.obj().put(t.key, t.value) }.forEach { arrayNode.add(it) }

        return Jackson.MinimalWriter.writeValueAsString(arrayNode)
    }

    /**
     * Return segment in the form "key1=value1&key2=value2"
     */
    fun toText(): String {
        return this.normalize().tags.joinToString("&") { "${it.key}=${it.value}" }
    }

    companion object {
        val All = Segment()

        fun of(tags: List<SegmentTag>?): Segment {
            return tags?.let { Segment(it).normalize() } ?: All
        }

        fun fromString(text: String): Segment {
            return Gson.fromJson(text, Segment::class.java)
        }

        fun fromTagsJson(tagsJson: String): Segment {
            val tags = Gson.fromJson(tagsJson, Array<SegmentTag>::class.java)
            return Segment(*tags).normalize()
        }

        fun fromTagsOrJson(tags: List<SegmentTag>?, tagsJson: String?): Segment {
            return tags?.let { of(tags) } ?: tagsJson?.let { fromTagsJson(it) } ?: All
        }

        /**
         * Parse a segment from text of form "key1=value1&key2=value2"
         */
        fun fromText(text: String): Segment {
            if (text.isEmpty()) return Segment(listOf())
            val tags = text.split('&').map { kvPairText ->
                val keyValuePair = kvPairText.split('=')
                if (keyValuePair.size != 2) {
                    throw Exception("Unable to parse segment tag $kvPairText in segment $text")
                }
                SegmentTag(key = keyValuePair[0], value = keyValuePair[1])
            }
            return Segment(tags)
        }
    }
}

class SegmentTypeConverter : DynamoDBTypeConverter<String, Segment> {
    override fun convert(segment: Segment): String {
        return segment.toString()
    }

    override fun unconvert(text: String): Segment {
        return Segment.fromString(text)
    }

    companion object {
        val Instance = SegmentTypeConverter()
    }
}

@Singleton
class SegmentTagConverter : TypeConverter<String, SegmentTag> {
    override fun convert(
        text: String?,
        targetType: Class<SegmentTag>?,
        context: ConversionContext?,
    ): Optional<SegmentTag> {
        return Optional.ofNullable(text?.let { SegmentTag.fromString(it) })
    }
}

@Singleton
class SegmentConverter : TypeConverter<String, Segment> {
    override fun convert(
        text: String?,
        targetType: Class<Segment>?,
        context: ConversionContext?,
    ): Optional<Segment> {
        return Optional.ofNullable(text?.let { Segment.fromString(it) })
    }
}

/**
 * Annotation so we can distinguish between our list versus a generic list.
 * Micronaut uses "comma" to handle list:
 * https://github.com/micronaut-projects/micronaut-core/blob/74b67f092917e52b27b918f90cc05f30eb05ae78/core/src/main/java/io/micronaut/core/convert/DefaultConversionService.java#L629
 *
 * We need to basically use this obscure "Format" annotation. It is used to look up converters:
 * https://github.com/micronaut-projects/micronaut-core/blob/74b67f092917e52b27b918f90cc05f30eb05ae78/core/src/main/java/io/micronaut/core/convert/DefaultConversionService.java#L944
 */
@Format("SegmentTags")
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class SegmentTagsAnnotation

/**
 * Convert a single string to a list of Segment Tag
 */
@Singleton
class NoOpConverter : FormattingTypeConverter<String, List<String>, SegmentTagsAnnotation> {

    override fun convert(
        text: String?,
        targetType: Class<List<String>>?,
        context: ConversionContext?,
    ): Optional<List<String>> {
        return Optional.ofNullable(text?.let { listOf(it) })
    }

    override fun annotationType(): Class<SegmentTagsAnnotation> {
        return SegmentTagsAnnotation::class.java
    }
}

/**
 * I don't fully understand this yet but this is called after the above [NoOpConverter].
 *
 * In addition, somehow it receives both List<String> and List<SegmentTag>. Somehow because of type erasure in the JVM
 *
 * We need to use ugly type checking here basically
 */
@Singleton
class SegmentTagsConverter : FormattingTypeConverter<List<*>, List<*>, SegmentTagsAnnotation> {
    override fun annotationType(): Class<SegmentTagsAnnotation> {
        return SegmentTagsAnnotation::class.java
    }

    override fun convert(
        list: List<*>?,
        targetType: Class<List<*>>?,
        context: ConversionContext?,
    ): Optional<List<*>> {
        if (list == null) {
            return Optional.empty()
        }
        if (list.isEmpty()) {
            return Optional.of(list)
        }
        return when (val first = list.first()!!) {
            is String -> Optional.of(list.map { SegmentTag.fromString(it as String) })
            is SegmentTag -> Optional.of(list)
            else -> error("Invalid type: ${first::class.qualifiedName}")
        }
    }
}

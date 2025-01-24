package ai.whylabs.songbird.util

import com.fasterxml.jackson.core.JsonFactory
import com.fasterxml.jackson.core.util.MinimalPrettyPrinter
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.ObjectWriter
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import java.io.File
import java.io.InputStream

object Jackson {
    val Factory = JsonFactory.builder().build()!!
    val Mapper = ObjectMapper(Factory)
    val MinimalWriter: ObjectWriter = Mapper.writer(MinimalPrettyPrinter())

    inline fun <reified T> parse(inputStream: InputStream): T {
        return Factory.createParser(inputStream).readValueAs(T::class.java)
    }

    inline fun <reified T> parse(file: File): T {
        return Factory.createParser(file).readValueAs(T::class.java)
    }

    inline fun <reified T> parse(text: String): T {
        return Factory.createParser(text).readValueAs(T::class.java)
    }

    fun parseObjectNode(inputStream: InputStream): ObjectNode {
        return this.parse<JsonNode>(inputStream).deepCopy()
    }

    fun parseStream(inputStream: InputStream): Iterator<ObjectNode> {
        val values = Mapper.readerFor(ObjectNode::class.java).readValues<ObjectNode>(inputStream)
        return values.iterator()
    }

    fun parseObjectNode(file: File): ObjectNode {
        return this.parse<JsonNode>(file).deepCopy()
    }

    fun parseObjectNode(text: String): ObjectNode {
        return this.parse<JsonNode>(text).deepCopy()
    }

    fun obj(): ObjectNode {
        return Mapper.createObjectNode()
    }

    fun array(): ArrayNode {
        return Mapper.createArrayNode()
    }
}

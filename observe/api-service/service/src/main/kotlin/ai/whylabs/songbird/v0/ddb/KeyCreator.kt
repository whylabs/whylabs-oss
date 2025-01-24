package ai.whylabs.songbird.v0.ddb

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTypeConverter
import com.amazonaws.services.dynamodbv2.model.AttributeValue

/**
 * Convenience class that can be used to implement both the [IdTypeConverter] and [BaseKey] interfaces with delegation.
 * Without this, creating implementations would be error prone because they both need to have the same
 * prefixes. This removes a bunch of boilerplate and ensures that the right arguments and types line up.
 */
internal class KeyCreator<T : BaseKey>(private vararg val prefixes: String, private val block: (MatchResult.Destructured) -> T) {
    fun baseKey(vararg values: String): BaseKey = object : BaseKey {
        override fun prefixes() = prefixes.asList()
        override fun values() = values.asList()
        override fun toString(): String {
            return toValidatedString(false)
        }
    }

    fun converter(): IdTypeConverter<T> {
        return object : IdTypeConverterImpl<T>(*prefixes) {
            override fun construct(res: MatchResult.Destructured): T {
                return block(res)
            }
        }
    }
}

interface BaseKey {
    fun prefixes(): List<String>
    fun values(): List<String>

    fun toValidatedString(validate: Boolean = true): String {
        val prefixes = prefixes()
        val values = values()

        if (prefixes.size != values.size) {
            throw IllegalArgumentException("Unable to decode ddb key. Got ${prefixes.size} prefixes and ${values.size} values.")
        }

        if (validate && values.any { it.isBlank() }) {
            throw IllegalArgumentException("Missing values: ${values.joinToString(",")}")
        }
        return prefixes.zip(values).flatMap { (p, v) -> listOf(p, v) }.joinToString("#")
    }

    fun toAttr(): AttributeValue {
        return AttributeValue(toValidatedString(false))
    }
}

internal interface IdTypeConverter<T : BaseKey> : DynamoDBTypeConverter<String, T>

private abstract class IdTypeConverterImpl<T : BaseKey>(vararg prefixes: String) : IdTypeConverter<T> {
    // the first match is the entire string so we have to add 10
    private val expectedGroupValueCount = prefixes.size + 1
    private val pattern = prefixes.joinToString("#") { "$it#([^#]+)" }
    private val regex = Regex(pattern)

    protected abstract fun construct(res: MatchResult.Destructured): T

    final override fun convert(id: T?): String? {
        return id?.toValidatedString()
    }

    final override fun unconvert(text: String?): T? {
        if (text == null) {
            return null
        }

        val res = construct(match(text))
        // call validation here before returning the value
        res.toValidatedString()
        return res
    }

    private fun match(text: String): MatchResult.Destructured {
        val res = regex.matchEntire(text)
        if (res == null) {
            throw IllegalArgumentException("Text $text did not match pattern $pattern")
        }

        if (expectedGroupValueCount != res.groupValues.size) {
            throw IllegalArgumentException("Expected $expectedGroupValueCount parts. Only matched to ${res.groupValues}")
        }
        return res.destructured
    }
}

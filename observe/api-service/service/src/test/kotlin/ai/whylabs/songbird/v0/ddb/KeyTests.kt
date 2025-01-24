package ai.whylabs.songbird.v0.ddb

import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.SegmentTag
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

internal class KeyTests {

    @Test
    fun `test roundtrip conversion`() {
        val converter = OrgKeyTypeConverter()
        val test = OrgKey("test")

        test.toValidatedString().shouldBe("ORG#test")
        converter.convert(test).shouldBe("ORG#test")
        converter.unconvert("ORG#test").shouldBe(test)
    }

    @Test
    fun `test invalid value`() {
        val converter = OrgKeyTypeConverter()
        val test = OrgKey("")

        assertThrows<IllegalArgumentException> {
            converter.convert(test)
        }
    }

    @Test
    fun `model key converts`() {
        val converter = ModelKeyTypeConverter()
        val test = ModelKey("test", "model")

        val text = "ORG#test#MODEL#model"
        test.toValidatedString().shouldBe(text)
        converter.convert(test).shouldBe(text)
        converter.unconvert(text).shouldBe(test)
    }

    @Test
    fun `dataset profile key converts`() {
        val converter = DatasetProfileKeyTypeConverter()

        val key = DatasetProfileKey("test", "profile")
        val text = "ORG#test#DATASET_PROFILE#profile"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `user key converts`() {
        val converter = UserKeyTypeConverter()

        val key = UserKey("id")
        val text = "USER#id"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `api key converts`() {
        val converter = ApiUserKeyTypeConverter()

        val key = ApiUserKey("id", "userId")
        val text = "ORG#id#USER#userId"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `partial dataset profile key converts`() {
        val converter = PartDatasetProfileKeyTypeConverter()

        val key = PartDatasetProfileKey("orgId", "profileId")
        val text = "ORG#orgId#PART_DATASET_PROFILE#profileId"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `session key converts`() {
        val converter = SessionKeyTypeConverter()

        val key = SessionKey("id")
        val text = "SESSION#id"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `membership key converts`() {
        val converter = MembershipKeyTypeConverter()

        val key = MembershipKey("orgId", "userId")
        val text = "ORG#orgId#MEMBERSHIP#userId"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `alerts key converts`() {
        val converter = AlertsKeyConverter()

        val key = AlertsKey("orgId", "alertId")
        val text = "ORG#orgId#ALERTS#alertId"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `events key converts`() {
        val converter = EventsKeyTypeConverter()

        val key = EventsKey("orgId", "eventId")
        val text = "ORG#orgId#EVENTS#eventId"

        key.toValidatedString().shouldBe(text)
        converter.convert(key).shouldBe(text)
        converter.unconvert(text).shouldBe(key)
    }

    @Test
    fun `segments key converts`() = testConversion(
        SegmentKeyTypeConverter(),
        SegmentKey("orgId", "modelId", Segment(listOf(SegmentTag("a", "1")))),
        "ORG#orgId#MODEL#modelId#SEGMENT#{\"tags\":[{\"key\":\"a\",\"value\":\"1\"}]}"
    )

    @Test
    fun `segment id key converts`() = testConversion(
        SegmentIdKeyTypeConverter(),
        SegmentIdKey("orgId", "modelId"),
        "ORG#orgId#SEGMENT_ID#modelId"
    )

    @Test
    fun `upload key converts`() = testConversion(
        LogEntryKeyTypeConverter(),
        LogEntryKey("orgId", "2"),
        "ORG#orgId#LOG_ENTRY#2"
    )
}

private fun <T : BaseKey> testConversion(converter: IdTypeConverter<T>, key: T, expected: String) {
    key.toValidatedString().shouldBe(expected)
    converter.convert(key).shouldBe(expected)
    converter.unconvert(expected).shouldBe(key)
}

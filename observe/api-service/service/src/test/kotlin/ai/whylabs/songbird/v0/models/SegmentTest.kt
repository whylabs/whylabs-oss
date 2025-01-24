package ai.whylabs.songbird.v0.models

import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

internal class SegmentTest {
    @Test
    fun `test handle empty segment`() {
        val res = Segment.fromString("""{"tags": []}""")
        res.tags.shouldBeEmpty()
    }

    @Test
    fun `test handle single list item`() {
        val res = Segment.fromString("""{"tags": [{"key": "foo", "value": "bar"}]}""")
        res.tags.shouldHaveSize(1)
        res.tags.first().key.shouldBe("foo")
        res.tags.first().value.shouldBe("bar")
    }

    @Test
    fun `test handle single quote strings`() {
        val res = Segment.fromString("""{'tags': [{'key': 'foo', 'value': 'bar'}]}""")
        res.tags.shouldHaveSize(1)
        res.tags.first().key.shouldBe("foo")
        res.tags.first().value.shouldBe("bar")
    }

    @Test
    fun `test normalized JSON string should be sorted`() {
        val res =
            Segment.fromString("""{"tags": [{"key": "zebra", "value": "animal"},{"key": "foo", "value": "bar"}, {"key": "any", "value": "value"}]}""")
        res.toCompactJsonString().shouldBe("""[{"any":"value"},{"foo":"bar"},{"zebra":"animal"}]""")
    }

    @Test
    fun `test parsing segment tags JSON`() {
        val res = Segment.fromTagsJson("""[{"key": "foo", "value": "bar"}]""")
        res.tags.shouldContainExactly(SegmentTag("foo", "bar"))
    }
}

internal class SegmentTagTest {
    @Test
    fun `test handle single quote strings`() {
        val segment = SegmentTag.fromString("{'key': 'foo', 'value': 'bar'}")
        segment.key.shouldBe("foo")
        segment.value.shouldBe("bar")
    }

    @Test
    fun `test handle double quote strings`() {
        val segment = SegmentTag.fromString("""{"key": "foo", "value": "bar"}""")
        segment.key.shouldBe("foo")
        segment.value.shouldBe("bar")
    }

    @Test
    fun `test handle java serialization with two spaces`() {
        val segment = SegmentTag.fromString(
            """class SegmentTag {
            |  key: foo "bar"
            |  value: :complextText
            |}
        """.trimMargin()
        )
        segment.key.shouldBe("foo \"bar\"")
        segment.value.shouldBe(":complextText")
    }

    @Test
    fun `test handle java serialization 4 spaces`() {
        val segment = SegmentTag.fromString(
            """class SegmentTag {
            |    key: purpose
            |    value: renewable_energy
            |}
        """.trimMargin()
        )
        segment.key.shouldBe("purpose")
        segment.value.shouldBe("renewable_energy")
    }

    @Test
    fun `test handle kotlin serialization`() {
        val segment =
            SegmentTag.fromString("SegmentTag(key=foo ( complex , text &  ,value= key = - = , value=bar     )")
        segment.key.shouldBe("foo ( complex , text &  ,value= key = - = ")
        segment.value.shouldBe("bar     ")
    }
}

package ai.whylabs.songbird.util

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets

internal class GzipUtilsTest {
    @Test
    fun `should handle gzipped data`() {
        val inputStream = javaClass.getResourceAsStream("/event.json.gz")!!
        val result = GzipUtils.deflate(inputStream)
        val bytes = result.use { it.readBytes() }
        val actual = String(bytes, StandardCharsets.UTF_8)
        val expected = String(javaClass.getResourceAsStream("/event.json")!!.readBytes(), StandardCharsets.UTF_8)
        actual shouldBe expected
    }

    @Test
    fun `should handle text data`() {
        val inputStream = javaClass.getResourceAsStream("/event.json")!!
        val result = GzipUtils.deflate(inputStream)
        val actual = String(result.use { it.readBytes() }, StandardCharsets.UTF_8)
        val expected = String(javaClass.getResourceAsStream("/event.json")!!.readBytes(), StandardCharsets.UTF_8)
        actual shouldBe expected
    }
}

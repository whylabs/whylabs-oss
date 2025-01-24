package ai.whylabs.songbird.util

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

internal class CustomChronoUnitTest {
    @Test
    fun `it handles CustomChronoUnit 15 Minutes`() {
        val chronoUnit = CustomChronoUnit.ofMinutes(15)
        chronoUnit.duration.seconds.shouldBe(900)
    }
}

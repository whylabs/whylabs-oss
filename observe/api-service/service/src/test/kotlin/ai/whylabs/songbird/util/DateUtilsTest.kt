package ai.whylabs.songbird.util

import ai.whylabs.dataservice.model.Granularity
import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.util.Date

internal class DateUtilsTest {
    @Test
    fun `it returns the correct datestring`() {
        val instant = ZonedDateTime.of(2021, 5, 20, 13, 0, 0, 0, ZoneOffset.UTC).toInstant()
        instant.toDateString().shouldBe("2021-05-20")
        instant.getHour().shouldBe(13)
    }

    @Test
    fun `parses ISO correctly`() {
        // test the hard coded ISO date parses to the right milli value
        val millis = 1629781823000
        val date = Date(millis)
        Assertions.assertEquals(millis, date.toISOString().parseAsISO().time)
    }

    @Test
    fun `epoch truncates for monthly`() {
        val millis = 1688685622000
        val truncated = millis.truncate(Granularity.MONTHLY)
        Assertions.assertEquals(1688169600000, truncated)
    }

    @Test
    fun `epoch truncates for weekly`() {
        val millis = 1688685622000
        val truncated = millis.truncate(Granularity.WEEKLY)
        Assertions.assertEquals(1688342400000, truncated)
    }

    @Test
    fun `epoch truncates for daily`() {
        val millis = 1688685622000
        val truncated = millis.truncate(Granularity.DAILY)
        Assertions.assertEquals(1688601600000, truncated)
    }

    @Test
    fun `epoch truncates for hourly`() {
        val millis = 1688685622000
        val truncated = millis.truncate(Granularity.HOURLY)
        Assertions.assertEquals(1688684400000, truncated)
    }

    @Test
    fun `epoch truncates for minutely`() {
        val millis = 1688685622000
        val truncated = millis.truncate(Granularity.MONTHLY)
        Assertions.assertEquals(1688169600000, truncated)
    }
}

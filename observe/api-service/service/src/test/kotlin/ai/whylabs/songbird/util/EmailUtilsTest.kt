package ai.whylabs.songbird.util

import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

internal class EmailUtilsTest {
    @Test
    fun `valid emails are permitted`() {
        val validEmails = listOf<String>(
            "user@whylabs.ai",
            "user.name@subdomain.whylabs.ai",
            "test@gmail.com",
            "user+whylabs@whylabs.ai",
            "user0123456789+whylabs@123.456.whylabs.ai",
        )
        validEmails.forEach { Assertions.assertTrue(EmailUtils.isValid(it)) }
    }

    @Test
    fun `invalid emails are not permitted`() {
        val invalidEmails = listOf<String>(
            "user@whylabs.ai, user2@whylabs.ai",
            "user@whylabs.ai; user2@whylabs.ai",
            "endsinperiod@whylabs.",
            "user@whylabs.ai\n user2@whylabs.ai",
            "somerandomstring",
        )
        invalidEmails.forEach { Assertions.assertFalse(EmailUtils.isValid(it)) }
    }

    @Test
    fun `null email is valid`() {
        Assertions.assertTrue(EmailUtils.isValid(null))
    }
}

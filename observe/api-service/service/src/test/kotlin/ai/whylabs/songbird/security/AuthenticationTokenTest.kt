package ai.whylabs.songbird.security

import io.kotest.matchers.shouldBe
import org.junit.jupiter.api.Test

internal class AuthenticationTokenTest {
    @Test
    fun `should handle token format without suffix`() {
        val authenticationToken = AuthenticationToken.fromString("token")
        authenticationToken.token shouldBe "token"
    }

    @Test
    fun `should handle token format with org suffix`() {
        val authenticationToken = AuthenticationToken.fromString("token:orgId")
        authenticationToken.token shouldBe "token"
        authenticationToken.metadata?.orgId shouldBe "orgId"
    }
}

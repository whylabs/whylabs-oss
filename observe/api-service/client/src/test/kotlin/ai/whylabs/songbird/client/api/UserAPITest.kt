package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.model.CreateUserRequest
import ai.whylabs.songbird.util.expectClientFailure
import java.util.UUID
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class UserAPITest {
    private val client = SongbirdClients.UserClient

    private fun getRandomEmail(): String {
        val rand = UUID.randomUUID().toString()
        return "foo+$rand@whylabs.ai"
    }

    @Test
    fun `email is not case sensitive`() {
        val rand = UUID.randomUUID().toString()
        val email = "FOo+$rand@whylabs.ai"
        val user = client.createUser(CreateUserRequest(email = email))

        val actualLower = client.getUserByEmail(email.lowercase())
        val actual = client.getUserByEmail(email)
        Assertions.assertEquals(actualLower, actual)

        val actual2 = client.getUser(user.userId)
        Assertions.assertEquals(user, actual2)
        Assertions.assertEquals(user.email.lowercase(), actual2.email, "email should be lower cased")
    }

    @Test
    fun `user creation and retrieval works`() {
        val email = getRandomEmail()
        client.createUser(CreateUserRequest(email = email))

        val user = client.getUserByEmail(email)
        Assertions.assertEquals(email, user.email, "email")

        val userById = client.getUser(user.userId)
        Assertions.assertEquals(user.userId, userById.userId, "userId")
    }

    @Test
    fun `user retrieval fails if it doesn't exist`() {
        val rand = UUID.randomUUID().toString()
        val email = "foo+$rand@whylabs.ai"

        expectClientFailure(404) {
            client.getUserByEmail(email)
        }

        expectClientFailure(404) {
            client.getUser(rand)
        }
    }

    @Test
    fun `user creation fails if the email is already taken`() {
        val email = getRandomEmail()
        client.createUser(CreateUserRequest(email = email))

        expectClientFailure(400) {
            client.createUser(CreateUserRequest(email = email))
        }
    }

    @Test
    fun `user update works`() {
        val email = getRandomEmail()
        val user = client.createUser(CreateUserRequest(email = email))

        val updatedEmail = "some_prefix+$email"
        val updatedUser = client.updateUser(user.copy(email = updatedEmail))

        Assertions.assertEquals(updatedEmail, updatedUser.email)
        Assertions.assertEquals(user.userId, updatedUser.userId)
    }
}
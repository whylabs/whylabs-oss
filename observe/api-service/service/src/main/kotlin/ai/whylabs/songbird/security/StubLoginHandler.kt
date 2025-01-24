package ai.whylabs.songbird.security

import io.micronaut.http.HttpRequest
import io.micronaut.http.MutableHttpResponse
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.authentication.AuthenticationResponse
import io.micronaut.security.handlers.LoginHandler
import jakarta.inject.Singleton

/**
 * We eagerly initialize our singletons (in Application.kt) so this is required.
 */
@Singleton
class StubLoginHandler : LoginHandler {
    override fun loginSuccess(userDetails: Authentication?, request: HttpRequest<*>?): MutableHttpResponse<*> {
        TODO("Not yet implemented")
    }

    override fun loginRefresh(
        userDetails: Authentication?,
        refreshToken: String?,
        request: HttpRequest<*>?,
    ): MutableHttpResponse<*> {
        TODO("Not yet implemented")
    }

    override fun loginFailed(
        authenticationResponse: AuthenticationResponse?,
        request: HttpRequest<*>?,
    ): MutableHttpResponse<*> {
        TODO("Not yet implemented")
    }
}

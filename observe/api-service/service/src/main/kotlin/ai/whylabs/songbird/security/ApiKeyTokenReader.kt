package ai.whylabs.songbird.security

import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.context.annotation.Primary
import io.micronaut.http.HttpRequest
import io.micronaut.security.token.reader.TokenReader
import jakarta.inject.Singleton
import java.util.Optional

// name of the auth mode
const val ApiKeyAuth = "ApiKeyAuth"

// the HTTP header/cookie used to extract the API key
const val ApiKeyHeader = "X-API-Key"

@Primary
@Singleton
class ApiKeyTokenReader : TokenReader, JsonLogging {
    override fun findToken(request: HttpRequest<*>): Optional<String> {
        val headerToken = request.headers[ApiKeyHeader]
        val cookieToken = request.cookies.get(ApiKeyHeader)?.value

        val value = headerToken ?: cookieToken
        val authToken = AuthenticationToken.fromString(value)
        log.debug {
            msg("Tokens from header and cookie")
            meta("header" to headerToken, "cookie" to cookieToken, "value" to value)
        }
        return Optional.ofNullable(authToken.token)
    }
}

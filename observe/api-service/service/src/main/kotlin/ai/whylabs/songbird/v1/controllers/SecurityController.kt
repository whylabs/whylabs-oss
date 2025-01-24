package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.cache.CacheKeyGenerator
import ai.whylabs.songbird.cache.CacheKeyType
import ai.whylabs.songbird.cache.NullableJedisPool
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.v0.controllers.Response
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/security")
@WhyLabsInternal
@Tags(
    Tag(name = "Security", description = "Endpoint for internal data."),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
class SecurityController @Inject constructor(
    val config: EnvironmentConfig,
    private val jedisPool: NullableJedisPool,
    private val cacheKeyGenerator: CacheKeyGenerator,
) : JsonLogging {
    @Operation(
        operationId = "RevokeUserSession",
        summary = "Endpoint to revoke user session permissions",
        description = "Endpoint to revoke user session permissions",
    )
    @Post(
        uri = "/session/revoke",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun revokeUserSession(
        @Body request: RevokeUserSessionRequest
    ): Response {
        try {
            val cacheKey = cacheKeyGenerator.getKey(CacheKeyType.UserSessionRevoked, request.sessionId).toByteArray()
            jedisPool.get().resource.use { jedis ->
                jedis.set(cacheKey, System.currentTimeMillis().toString().toByteArray())
                jedis.expire(cacheKey, 60 * 60 * 24 * 7) // 7 days
            }
        } catch (e: Exception) {
            log.warn("Failed to revoke session id: {}. Exception: {}", request.sessionId, e.message)
        }

        return Response()
    }

    @Operation(
        operationId = "ValidateUserSession",
        summary = "Endpoint to check if a user session is revoked",
        description = "Endpoint to check if a user session is revoked",
    )
    @Get(
        uri = "/session/validate",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun validateUserSession(
        @QueryValue session_id: String,
    ): ValidateUserSessionResponse {
        val cacheKey = cacheKeyGenerator.getKey(CacheKeyType.UserSessionRevoked, session_id)
        if (!jedisPool.isEmpty && jedisPool.get().resource.use { jedis -> jedis.exists(cacheKey) }) {
            return ValidateUserSessionResponse(isValid = false)
        }
        return ValidateUserSessionResponse(isValid = true)
    }
}

data class RevokeUserSessionRequest(
    @Schema(required = true) val sessionId: String
)

data class ValidateUserSessionResponse(
    val isValid: Boolean
)

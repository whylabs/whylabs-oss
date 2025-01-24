package ai.whylabs.songbird.security

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.cache.ApiKeyUsageCache
import ai.whylabs.songbird.common.WhyLabsHeaders
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.SecurityValues.AllRoleScopes
import ai.whylabs.songbird.security.SecurityValues.AllSupportedScopes
import ai.whylabs.songbird.security.SecurityValues.AuthenticatedRole
import ai.whylabs.songbird.security.SecurityValues.ExternalRoleScopes
import ai.whylabs.songbird.security.SecurityValues.InternalRoleScopes
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSuperAdminOrgId
import ai.whylabs.songbird.v0.dao.ApiKeyDAO
import ai.whylabs.songbird.v0.dao.ApiKeyItem
import com.google.common.hash.Hashing
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpRequest
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.authentication.ServerAuthentication
import io.micronaut.security.token.validator.TokenValidator
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.reactivestreams.Publisher
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.time.Instant
import kotlin.math.min

private fun localValidatedToken(orgId: String): ValidatedIdentity {
    return ValidatedIdentity(
        type = IdentityType.WhyLabsOperator,
        orgId = orgId,
        principalId = "localUser",
        identityId = "localKey",
        expirationTime = Instant.MAX,
        scopes = AllSupportedScopes,
        roles = AllSupportedScopes.map { AllRoleScopes[it] ?: it }.toSet(),
        resourceId = null,
    )
}

private val Anonymous = ServerAuthentication("anonymous", listOf(), mapOf())

@Singleton
class ApiKeyValidator @Inject constructor(
    private val config: EnvironmentConfig,
    private val apiKeyDAO: ApiKeyDAO,
    private val awsIdentityValidator: AWSIdentityValidator,
    private val apiKeyUsageCache: ApiKeyUsageCache,
) : TokenValidator, JsonLogging {

    override fun validateToken(apiKey: String?, request: HttpRequest<*>?): Publisher<Authentication> {
        return if (config.isAuthorizationDisabled()) {
            // For local debug we set a claimId from the API key entered in the swaggerui/curl, to facilitate testing
            val apiHeader = request?.headers?.get(WhyLabsHeaders.WhyLabsApiKeyHeader)
            val orgId = apiHeader?.substringAfterLast(':', "org-0") ?: "org-0"
            val authN = localValidatedToken(orgId).toAuthentication()
            log.error("AuthZ is disabled for local mode. Use local authentication data: ${authN.name}")
            log.error("Set environment variable {} or system property enable.security to true to test auth locally", EnvironmentVariable.EnableSecurity.value)
            Publishers.just(authN)
        } else {
            val authN = apiKey?.let { validateApiKey(it, request) }?.toAuthentication()
            Publishers.just(authN ?: Anonymous)
        }
    }

    private fun validateApiKey(key: String, request: HttpRequest<*>?): ValidatedIdentity? {
        if (AWSIdentityValidator.isJsonFormat(key)) {
            // using internal service key
            val awsIdentity = awsIdentityValidator.validate(key) ?: return null
            val userIdentity = request?.headers?.get("X-Forwarded-Identity") ?: awsIdentity.identityId
            return awsIdentity.copy(identityId = userIdentity)
        }
        if (key.length != ApiKey.Len) {
            if (key.isNotBlank()) {
                log.debug {
                    val keyPrefix = key.substring(0, min(0, key.length))
                    msg { "Key length not matched. Key prefix: $keyPrefix" }
                    meta("keyPrefix" to keyPrefix)
                }
            }
            return null
        }

        val keyHash = ApiKey.hash(key)

        // attempt to parse the key
        ApiKey.parse(key) ?: return null

        val item = apiKeyDAO.load(keyHash) ?: return null
        apiKeyUsageCache.updateLastUsed(item.keyHash)

        return ValidatedIdentity.validate(item, Instant.now())
    }
}

data class ApiKey(val id: String, val suffix: String) {
    init {
        require(id.length == IdLen) { "Incorrect ID len: $id. Expected: $IdLen" }
        require(suffix.length == SuffixLen) { "Invalid suffix len: $suffix. Expected: $SuffixLen" }
    }

    override fun toString(): String {
        return "$id.$suffix"
    }

    fun toHash(): String {
        return hash(toString())
    }

    companion object {
        // total key length is 64 characters with a "dot" in the middle
        const val Len = 64
        const val IdLen = 10
        const val SuffixLen = (Len - IdLen - 1)

        private const val ComplexCharacters = "+-^!$&@"
        private val AlphaNumericChars = ('a'..'z') + ('A'..'Z') + ('0'..'9')
        private val ComplexChars = AlphaNumericChars.toCharArray().toList()
        private val Random = SecureRandom()
        private val Pattern = Regex("([a-zA-Z0-9]{$IdLen})\\.([a-zA-Z0-9\\Q$ComplexCharacters\\E]{$SuffixLen})")

        fun parse(key: String): ApiKey? {
            val matchResult = Pattern.matchEntire(key) ?: return null
            val (id, suffix) = matchResult.destructured
            return ApiKey(id, suffix)
        }

        fun generateKey(): ApiKey {
            val id = generatePart(IdLen, AlphaNumericChars)
            val suffix = generatePart(SuffixLen, ComplexChars)

            return ApiKey(id, suffix)
        }

        fun hash(key: String): String {
            return Hashing.sha256().hashString(key, StandardCharsets.UTF_8).toString()
        }

        private fun generatePart(len: Int, charList: List<Char>): String {
            // ensure the last character is alphanumeric
            val lastCharacter = charList[Random.nextInt(AlphaNumericChars.size)]
            return (1 until len).map {
                charList[Random.nextInt(charList.size)]
            }.joinToString("") + lastCharacter
        }
    }
}

enum class IdentityType {
    WhyLabsService,
    WhyLabsOperator,
    System,
    ApiKey,
    User,
}

data class ValidatedIdentity(
    val type: IdentityType,
    val orgId: String,
    val principalId: String,
    val identityId: String,
    val resourceId: String?,
    val expirationTime: Instant?,
    val scopes: Set<String>,
    val roles: Set<String>,
) {

    companion object : JsonLogging {
        fun validate(item: ApiKeyItem, now: Instant = Instant.now()): ValidatedIdentity? {
            if (item.orgKey.orgId != item.userKey.orgId) {
                // This shouldn't happen but we shouldn't throw if it does because we shouldn't be using the orgKey's orgId
                // anywhere in here, only the userKey's orgId
                log.warn("The orgId in orgKey (${item.orgKey.orgId}) and userKey (${item.userKey.orgId}) are different.")
            }

            val expirationTime = item.expirationTime?.toInstant() ?: Instant.MAX
            if (now.isAfter(expirationTime)) {
                log.debug {
                    msg("Expired token")
                    meta("keyId" to item.keyId, "expiration" to expirationTime.toString())
                }

                return null
            }

            if (item.isRevoked == true) {
                log.debug {
                    msg("Revoked token")
                    meta("keyId" to item.keyId)
                }

                return null
            }

            val roles = mutableSetOf(AuthenticatedRole) // all keys have this role
            val scopes = item.scopes ?: setOf()
            val identityType: IdentityType
            val principalId: String
            if (WhyLabsSuperAdminOrgId == item.userKey.orgId) {
                log.info {
                    msg("WhyLabs API key")
                    meta("keyId" to item.keyId)
                }
                InternalRoleScopes.forEach { (scope, role) ->
                    if (scopes.contains(scope)) {
                        roles.add(role)
                    }
                }
                ExternalRoleScopes.forEach { (_, role) ->
                    roles.add(role) // add all external roles automatically
                }
                identityType = IdentityType.WhyLabsOperator
                principalId = item.keyHash.substring(0, min(item.keyHash.length, 32))
            } else {
                ExternalRoleScopes.forEach { (scope, role) ->
                    if (scopes.contains(scope)) {
                        roles.add(role)
                    }
                }
                identityType = IdentityType.ApiKey
                principalId = item.userKey.userId
            }

            return ValidatedIdentity(
                type = identityType,
                orgId = item.userKey.orgId,
                principalId = principalId,
                identityId = item.keyId,
                resourceId = item.resourceId,
                expirationTime = expirationTime,
                scopes = scopes,
                roles = roles
            )
        }
    }

    fun toAuthentication(): Authentication {
        return ServerAuthentication(
            principalId,
            roles,
            mapOf(
                Claims.Organization to orgId,
                Claims.ExpirationTime to expirationTime,
                Claims.Roles to roles,
                Claims.Key to this,
                Claims.Scopes to scopes
            )
        )
    }

    fun allowed(resourceId: String): Boolean {
        return this.resourceId == null || this.resourceId == resourceId
    }
}

fun Authentication.getKey(): ValidatedIdentity {
    return this.attributes["key"] as ValidatedIdentity
}

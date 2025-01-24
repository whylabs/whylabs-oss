package ai.whylabs.songbird.security

import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.auth.AWSStaticCredentialsProvider
import com.amazonaws.auth.BasicSessionCredentials
import com.amazonaws.regions.Regions
import com.amazonaws.services.securitytoken.AWSSecurityTokenService
import com.amazonaws.services.securitytoken.AWSSecurityTokenServiceClient
import com.amazonaws.services.securitytoken.model.AWSSecurityTokenServiceException
import com.amazonaws.services.securitytoken.model.GetCallerIdentityRequest
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.Instant
import java.util.Optional
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import kotlin.math.min

private val SystemKeyBase = ValidatedIdentity(
    type = IdentityType.System,
    orgId = SecurityValues.WhyLabsSuperAdminOrgId,
    principalId = "PLACEHOLDER",
    identityId = "AWS",
    expirationTime = Instant.MAX,
    scopes = setOf(
        SecurityValues.WhyLabsSystemScope,
        SecurityValues.AdministratorScope,
        SecurityValues.UserScope
    ),
    roles = setOf(
        SecurityValues.WhyLabsSystemRole,
        SecurityValues.AdministratorRole,
        SecurityValues.UserRole
    ),
    resourceId = null,
)

data class AWSSessionCredentials(
    val AccessKeyId: String,
    val SecretAccessKey: String,
    val SessionToken: String
) {
    fun toSdkCredentials(): BasicSessionCredentials {
        return BasicSessionCredentials(this.AccessKeyId, this.SecretAccessKey, this.SessionToken)
    }
}

interface STSClientFactory {
    fun create(credentials: AWSSessionCredentials): AWSSecurityTokenService
}

@Singleton
class STSClientFactoryImpl : STSClientFactory {
    override fun create(credentials: AWSSessionCredentials): AWSSecurityTokenService {
        return AWSSecurityTokenServiceClient.builder()
            .withRegion(Regions.US_EAST_1)
            .withCredentials(AWSStaticCredentialsProvider(credentials.toSdkCredentials()))
            .build()
    }
}

/**
 * Instead of hard code our identities in our applications, we use AWS to verify the caller's identity.
 *
 * This is done by calling AWS STS AssumeRole to assume an identity, and then pass the credentials to Songbird.
 *
 * The credential can then be used by Songbird to call AWS STS to verify the identity of the caller. This should
 * only be applied for internal users - external users are expected to use API keys.
 */
@Singleton
class AWSIdentityValidator @Inject constructor(
    private val stsClientFactory: STSClientFactory,
    private val awsAccountContext: AwsAccountContext,
) : JsonLogging {
    private val gson = Gson()
    private val cachedResult: LoadingCache<AWSSessionCredentials?, Optional<ValidatedIdentity>> =
        CacheBuilder.newBuilder()
            // these credentials should expire after 15 minutes
            .expireAfterWrite(15, TimeUnit.MINUTES)
            .maximumSize(10000)
            .build(
                CacheLoader.from { credentials: AWSSessionCredentials? ->
                    validateCredentials(credentials)
                }
            )

    private fun validateCredentials(credentials: AWSSessionCredentials?): Optional<ValidatedIdentity> {
        if (credentials == null) {
            return Optional.empty()
        }

        val sts = stsClientFactory.create(credentials)
        try {
            val result = sts.getCallerIdentity(GetCallerIdentityRequest())
            if (result.account != awsAccountContext.getAwsAccountId()) {
                log.warn {
                    msg("Mismatched STS token detected")
                    meta(
                        "account" to result.account,
                        "arn" to result.arn,
                        "userId" to result.userId
                    )
                }
                return Optional.empty()
            }

            log.info("Validated credential for ${result.arn}")
            return Optional.of(SystemKeyBase.copy(principalId = result.arn, identityId = result.account))
        } catch (e: AWSSecurityTokenServiceException) {
            log.info {
                msg { "STS verification failed. Reason: ${e.message}" }
                meta("accessKeyId" to credentials.AccessKeyId)
            }
            return Optional.empty()
        } finally {
            sts.shutdown()
        }
    }

    fun validate(key: String): ValidatedIdentity? {
        return try {
            val credentials = gson.fromJson(key, AWSSessionCredentials::class.java)
            cachedResult.get(credentials).orElse(null)
        } catch (e: JsonSyntaxException) {
            log.info {
                msg("Failed to parse AWS credential")
                meta("keyPrefix" to key.substring(0, min(key.length, 10)))
            }
            null
        } catch (e: ExecutionException) {
            null
        }
    }

    companion object {
        fun isJsonFormat(key: String): Boolean {
            return key.trim().startsWith("{") && key.endsWith("}")
        }
    }
}

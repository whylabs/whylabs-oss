package ai.whylabs.songbird.util

import com.amazonaws.services.secretsmanager.AWSSecretsManager
import com.amazonaws.services.secretsmanager.model.CreateSecretRequest
import com.amazonaws.services.secretsmanager.model.DecryptionFailureException
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest
import com.amazonaws.services.secretsmanager.model.InternalServiceErrorException
import com.amazonaws.services.secretsmanager.model.InvalidParameterException
import com.amazonaws.services.secretsmanager.model.InvalidRequestException
import com.amazonaws.services.secretsmanager.model.ResourceExistsException
import com.amazonaws.services.secretsmanager.model.ResourceNotFoundException
import com.amazonaws.services.secretsmanager.model.Tag
import com.amazonaws.services.secretsmanager.model.TagResourceRequest
import com.amazonaws.services.secretsmanager.model.UpdateSecretRequest
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Base64

/**
 * These errors are thrown by the AWS SDK when something specific is wrong.
 * There's no point in retrying these.
 */
private val ignoreNonRetriableErrors: SkipIf = {
    val nonRetriableErrors = setOf(
        DecryptionFailureException::class.java,
        InternalServiceErrorException::class.java,
        InvalidParameterException::class.java,
        InvalidRequestException::class.java,
        ResourceNotFoundException::class.java,
    )
    nonRetriableErrors.contains(it::class.java)
}

enum class SecretType(val prefix: String) {
    Databricks("DatabricksSecrets/connection"),
    DatabricksStaged("DatabricksSecrets/staged")
}

private const val expirationTag = "expiration"

@Singleton
class SecretManagerUtils @Inject constructor(private val client: AWSSecretsManager) {

    /**
     * Set the metadata for a secret to reflect the intended expiration.
     * This won't actually delete it but it will give us the ability to tell what should be deleted
     * from a lambda or something later on when we actually enforce the expiration. Main use case
     * for this is the databricks staged metadata which has a ttl and a pointer to a secret.
     */
    private suspend fun setExpirationTag(secretId: String, expirationSeconds: Long?) {
        val tags = if (expirationSeconds == null) {
            emptyList<Tag>()
        } else {
            mutableListOf(
                Tag()
                    .withKey(expirationTag)
                    .withValue(expirationSeconds.toString())
            )
        }

        retryService(ignoreNonRetriableErrors) {
            client.tagResource(
                TagResourceRequest()
                    .withSecretId(secretId)
                    .withTags(tags)
            )
        }
    }

    suspend fun updateSecret(secretId: String, secretValue: String, expirationSeconds: Long?) {
        retryService(ignoreNonRetriableErrors) {
            client.updateSecret(
                UpdateSecretRequest()
                    .withSecretString(secretValue)
                    .withSecretId(secretId)
            )
        }
        setExpirationTag(secretId, expirationSeconds)
    }

    private suspend fun createSecret(secretId: String, secretValue: String, expirationSeconds: Long?) {
        retryService(ignoreNonRetriableErrors) {
            client.createSecret(
                CreateSecretRequest()
                    .withSecretString(secretValue)
                    .withName(secretId)
            )
        }
        setExpirationTag(secretId, expirationSeconds)
    }

    suspend fun createOrUpdateSecret(type: SecretType, secretId: String, secretValue: String, expirationSeconds: Long? = null): String {
        val prefixedId = "${type.prefix}/$secretId"
        try {
            createSecret(prefixedId, secretValue, expirationSeconds)
        } catch (e: ResourceExistsException) {
            updateSecret(prefixedId, secretValue, expirationSeconds)
        }
        return prefixedId
    }

    suspend fun getSecret(secretId: String): String {
        val getSecretValueResult = try {
            retryService(ignoreNonRetriableErrors) {
                client.getSecretValue(GetSecretValueRequest().withSecretId(secretId))
            }
        } catch (e: ResourceNotFoundException) {
            throw IllegalStateException("Secret $secretId not found")
        }

        // Decrypts secret using the associated KMS key.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        return if (getSecretValueResult.secretString != null) {
            getSecretValueResult.secretString
        } else {
            String(Base64.getDecoder().decode(getSecretValueResult.secretBinary).array())
        }
    }
}

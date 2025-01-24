package ai.whylabs.songbird

import ai.whylabs.songbird.EnvironmentVariable.CfSignerSecretId
import ai.whylabs.songbird.EnvironmentVariable.GCPPubsubTopicName
import ai.whylabs.songbird.EnvironmentVariable.GCPSecretId
import ai.whylabs.songbird.EnvironmentVariable.GCPWorkspaceId
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.AwsCredentialsProviderChain
import com.amazonaws.AmazonClientException
import com.amazonaws.AmazonServiceException
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.auth.DefaultAWSCredentialsProviderChain
import com.amazonaws.auth.PEM
import com.amazonaws.regions.DefaultAwsRegionProviderChain
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3ClientBuilder
import com.amazonaws.services.secretsmanager.AWSSecretsManager
import com.amazonaws.services.secretsmanager.AWSSecretsManagerClient
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest
import com.amazonaws.services.securitytoken.AWSSecurityTokenService
import com.amazonaws.services.securitytoken.AWSSecurityTokenServiceClient
import com.amazonaws.services.sqs.AmazonSQS
import com.amazonaws.services.sqs.AmazonSQSAsync
import com.amazonaws.services.sqs.AmazonSQSAsyncClientBuilder
import com.amazonaws.services.sqs.AmazonSQSClientBuilder
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.google.api.gax.core.CredentialsProvider
import com.google.api.gax.core.FixedCredentialsProvider
import com.google.auth.oauth2.GoogleCredentials
import com.google.cloud.bigquery.BigQuery
import com.google.cloud.bigquery.BigQueryOptions
import com.google.gson.Gson
import com.google.pubsub.v1.TopicName
import io.github.cdimascio.dotenv.dotenv
import io.micronaut.context.annotation.Factory
import jakarta.inject.Named
import jakarta.inject.Singleton
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.security.PrivateKey
import java.util.Base64
import com.google.cloud.pubsub.v1.Publisher as PubsubPublisher

// Need to do this until we roll out GCP integration across our platform
data class NullableGoogleCredentialsProvider(val credentials: CredentialsProvider? = null) {
    val isEmpty get() = credentials == null
    fun get(): CredentialsProvider = credentials!!
}

data class NullablePubsubClient(val client: PubsubPublisher? = null) {
    val isEmpty get() = client == null
    fun get(): PubsubPublisher = client!!
}

data class CloudfrontSigningKey(val pem: String)

@Factory
internal class SongbirdFactory : JsonLogging {

    @Singleton
    fun load(): EnvironmentConfigImpl {
        val stage = try {
            Stage.valueOf(System.getenv("STAGE")!!.replaceFirstChar { it.uppercaseChar() })
        } catch (e: Exception) {
            log.warn("Failed to detect stage from environment: {}. Falling back to local stage")
            Stage.Local
        }

        val region = try {
            DefaultAwsRegionProviderChain().region
        } catch (e: AmazonClientException) {
            log.warn("Failed to load AWS region: {}.", e.message)

            if (stage == Stage.Local) {
                log.info("In local mode. Fall back to us-west-2")
                "us-west-2"
            } else {
                throw IllegalStateException("Cannot detect AWS region in non-local stage. Aborting!")
            }
        }

        // for local stage, try to use the .env file
        if (stage == Stage.Local) {
            val envConfig = dotenv {
                // ignore errors, as we'll just fall back to env vars if needed
                ignoreIfMalformed = true
                ignoreIfMissing = true
            }
            if (envConfig.entries().size > 0) {
                val configMap = envConfig.entries().map { it.key to it.value }.toMap()
                return EnvironmentConfigImpl(stage, region, configMap)
            }
        }

        return EnvironmentConfigImpl(stage, region, System.getenv().toMap())
    }

    @Singleton
    fun awsCredentialsProvider(config: EnvironmentConfig): AWSCredentialsProvider {
        return if (config.getStage() == Stage.Local) {
            AwsCredentialsProviderChain()
        } else {
            DefaultAWSCredentialsProviderChain()
        }
    }

    @Singleton
    fun s3Client(config: EnvironmentConfig, credentialsProvider: AWSCredentialsProvider): AmazonS3 {
        return AmazonS3ClientBuilder.standard().withRegion(config.getRegion()).withCredentials(credentialsProvider)
            .build()
    }

    @Singleton
    fun sqsAsyncClient(
        config: EnvironmentConfig,
        credentialsProvider: AWSCredentialsProvider
    ): AmazonSQSAsync {
        return AmazonSQSAsyncClientBuilder.standard().withRegion(config.getRegion())
            .withCredentials(credentialsProvider).build()
    }

    @Singleton
    fun sqsClient(
        config: EnvironmentConfig,
        credentialsProvider: AWSCredentialsProvider
    ): AmazonSQS {
        return AmazonSQSClientBuilder.standard().withRegion(config.getRegion()).withCredentials(credentialsProvider)
            .build()
    }

    @Singleton
    fun dynamoDbClient(
        config: EnvironmentConfig,
        credentialsProvider: AWSCredentialsProvider
    ): AmazonDynamoDB {
        return AmazonDynamoDBClientBuilder.standard().withRegion(config.getRegion())
            .withCredentials(credentialsProvider).build()
    }

    @Singleton
    fun stsClient(
        config: EnvironmentConfig,
        credentialsProvider: AWSCredentialsProvider,
    ): AWSSecurityTokenService {
        return AWSSecurityTokenServiceClient.builder().withRegion(config.getRegion())
            .withCredentials(credentialsProvider).build()
    }

    @Singleton
    fun secretManagerClient(
        config: EnvironmentConfig,
        credentialsProvider: AWSCredentialsProvider,
    ): AWSSecretsManager {
        return AWSSecretsManagerClient.builder().withRegion(config.getRegion()).withCredentials(credentialsProvider)
            .build()
    }

    @Named("LogCloudFront")
    @Singleton
    fun songbirdCloudfrontSigningKey(
        config: EnvironmentConfig,
        secretsManager: AWSSecretsManager
    ): PrivateKey {
        val req = GetSecretValueRequest().withSecretId(config.getEnv(CfSignerSecretId))
        val secretValue = secretsManager.getSecretValue(req)
        val cfSecret = Gson().fromJson(secretValue.secretString, CloudfrontSigningKey::class.java)
        return PEM.readPrivateKey(ByteArrayInputStream(Base64.getDecoder().decode(cfSecret.pem)))
    }

    @Singleton
    fun gcpCredentials(
        config: EnvironmentConfig,
        secretsManager: AWSSecretsManager
    ): NullableGoogleCredentialsProvider {
        return try {
            val gcpSecretId = config.getEnv(GCPSecretId)

            log.infoMsg { "Fetching secret: $gcpSecretId" }
            val req = GetSecretValueRequest().withSecretId(gcpSecretId)
            val secretValue = secretsManager.getSecretValue(req)
            val bytes = secretValue.secretString.toByteArray(StandardCharsets.UTF_8)
            log.infoMsg { "Successfully fetched secret: $gcpSecretId" }
            NullableGoogleCredentialsProvider(
                FixedCredentialsProvider.create(
                    GoogleCredentials.fromStream(
                        ByteArrayInputStream(bytes)
                    )
                )
            )
        } catch (e: MissingEnvironmentVariableException) {
            log.warnMsg { "GCP environment variable not set : ${e.message}" }
            NullableGoogleCredentialsProvider()
        } catch (e: AmazonServiceException) {
            log.warnMsg { "Failed to call AWS secret manager: ${e.message}" }
            NullableGoogleCredentialsProvider()
        }
    }

    @Singleton
    fun objectMapper(): ObjectMapper {
        return jacksonObjectMapper()
    }

    @Singleton
    fun pubsubClient(
        config: EnvironmentConfig,
        credentials: NullableGoogleCredentialsProvider,
    ): NullablePubsubClient? {
        if (credentials.isEmpty) {
            log.warnMsg { "Empty GCP credentials. Skipping pubsub client creation" }
            return NullablePubsubClient()
        }

        return try {
            val topic = TopicName.of(config.getEnv(GCPWorkspaceId), config.getEnv(GCPPubsubTopicName))
            log.info { "Creating Pubsub client for: $GCPWorkspaceId/$GCPPubsubTopicName" }
            NullablePubsubClient(PubsubPublisher.newBuilder(topic).setCredentialsProvider(credentials.get()).build())
        } catch (e: MissingEnvironmentVariableException) {
            log.warnMsg { "Missing environment variable: ${e.message}" }
            NullablePubsubClient()
        }
    }

    @Singleton
    fun bigQueryService(
        credentialsProvider: NullableGoogleCredentialsProvider
    ): BigQuery {
        return BigQueryOptions.newBuilder().setCredentials(credentialsProvider.get().credentials).build().service
    }
}

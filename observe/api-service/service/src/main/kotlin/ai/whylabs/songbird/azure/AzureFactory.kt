package ai.whylabs.songbird.azure

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.secretsmanager.AWSSecretsManager
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest
import com.azure.core.amqp.AmqpRetryMode
import com.azure.core.amqp.AmqpRetryOptions
import com.azure.messaging.eventhubs.EventHubClientBuilder
import com.google.gson.Gson
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton
import java.time.Duration

@Factory
class AzureFactory : JsonLogging {
    @Singleton
    fun azureSecrets(config: EnvironmentConfig, secretsManager: AWSSecretsManager): NullableAzureSecrets {
        return try {
            val secretName = config.getEnv(EnvironmentVariable.AzureSecretName)
            val response = secretsManager.getSecretValue(GetSecretValueRequest().withSecretId(secretName))
            log.info("Using Azure secret version: ${response.versionId}. Name: $secretName")
            val secretString = response.secretString

            val secrets = Gson().fromJson(secretString, AzureSecrets::class.java)
            NullableAzureSecrets(secrets)
        } catch (e: Throwable) {
            log.warn("Fail to fetch Azure secret. Exception: {}", e.message)
            NullableAzureSecrets()
        }
    }

    @Singleton
    fun azureEventHubClient(config: EnvironmentConfig, secrets: NullableAzureSecrets): NullableAzureEventHubClient {
        return try {
            val eventHub = config.getEnv(EnvironmentVariable.AzureEventHubName)
            log.info("Using Azure EventHub: $eventHub")
            val retryPolicy = AmqpRetryOptions() //
                .setMaxRetries(10)
                .setMaxDelay(Duration.ofSeconds(5))
                .setMode(AmqpRetryMode.EXPONENTIAL)
                .setTryTimeout(Duration.ofSeconds(10))
            val client = EventHubClientBuilder() //
                .connectionString(secrets.get().EventHubConnection, eventHub)
                .configuration(
                    com.azure.core.util.ConfigurationBuilder()
                        .putProperty("com.azure.messaging.eventhubs.v2", "true")
                        .build()
                )
                .retryOptions(retryPolicy)
                .buildProducerClient()

            NullableAzureEventHubClient(client)
        } catch (e: Throwable) {
            log.warn("Fail to create azure event hub client. Exception: {}", e.message)
            NullableAzureEventHubClient()
        }
    }
}

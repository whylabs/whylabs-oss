package ai.whylabs.songbird.azure

import com.azure.messaging.eventhubs.EventHubProducerClient

data class AzureSecrets(
    val EventHubConnection: String,
    val MarketplaceWebhookAud: String? = null,
    val MarketplaceWebhookTid: String? = null,
    val MarketplaceWebhookAppid: String? = null,
    val AppSecretId: String? = null,
    val AppSecretValue: String? = null,
)

data class NullableAzureSecrets(val secrets: AzureSecrets? = null) {
    val isEmpty get() = secrets == null
    fun get(): AzureSecrets = secrets!!
}

data class NullableAzureEventHubClient(val client: EventHubProducerClient? = null) {
    val isEmpty get() = client == null
    fun get(): EventHubProducerClient = client!!
}

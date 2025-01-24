package ai.whylabs.songbird.sqs

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.loggerOf
import ai.whylabs.songbird.v0.dao.AWSMarketplace
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadata
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadataDAO
import ai.whylabs.songbird.v0.ddb.AWSMarketplaceMetadataItem
import com.amazonaws.services.sqs.AmazonSQSAsync
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import io.micronaut.context.event.ApplicationEventListener
import io.micronaut.discovery.event.ServiceReadyEvent
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.slf4j.LoggerFactory
import java.lang.IllegalArgumentException
import java.util.Date

enum class SubscriptionAction(val action: String) {
    @JsonProperty("subscribe-success")
    SubscriptionSuccess("subscribe-success"),

    @JsonProperty("subscribe-fail")
    SubscriptionFail("subscribe-fail"),

    @JsonProperty("unsubscribe-pending")
    UnsubscribePending("unsubscribe-pending"),

    @JsonProperty("unsubscribe-success")
    UnsubscribeSuccess("unsubscribe-success"),

    @JsonProperty("entitlement-updated")
    EntitlementUpdated("entitlement-updated"),
}

class AWSMarketplaceMessage(
    val action: SubscriptionAction,
    @JsonProperty("customer-identifier")
    val customerIdentifier: String,
    @JsonProperty("product-code")
    val productCode: String,
    @JsonProperty("offer-identifier")
    val offerIdentifier: String? = null
)

private fun updateMarketplaceMetadata(metadata: AWSMarketplaceMetadata, awsMarketplaceMetadataDAO: AWSMarketplaceMetadataDAO, awsMarketplace: AWSMarketplace) {
    // Call GetEntitlements and update with that
    val entitlements = awsMarketplace.getCustomerEntitlementMetadata(metadata.awsMarketplaceCustomerId)

    val updatedItem =
        awsMarketplaceMetadataDAO.toItem(
            metadata.copy(
                expirationTime = entitlements.expirationTime,
                dimension = entitlements.dimension,
                expirationUpdateTime = Date() // now
            )
        )
    log.info("Updating marketplace metadata to $updatedItem")
    awsMarketplaceMetadataDAO.update(updatedItem)
}

private val objectMapper = jacksonObjectMapper()
private val log = loggerOf(AWSMarketplaceSQSConsumer::class.java)

fun processMarketplaceMessage(awsMarketplaceMetadataDAO: AWSMarketplaceMetadataDAO, awsMarketplace: AWSMarketplace): SQSMessageProcessor {
    log.info("Listening to marketplace sqs queues.")
    return processor@{ message ->
        // Parse body into a AWSMarketplaceMessage
        val body = message.body
        val msg = objectMapper.readValue<AWSMarketplaceMessage>(body)
        log.info("Processing marketplace message $body")

        // Load the metadata as it currently is in ddb
        val metadata = awsMarketplaceMetadataDAO.load(AWSMarketplaceMetadataItem(awsMarketplaceCustomerId = msg.customerIdentifier))
            ?: throw IllegalArgumentException("Couldn't find metadata for customer id ${msg.customerIdentifier}")

        // Regardless of the message, we're just going to pull the latest entitlement info and update ddb with it
        updateMarketplaceMetadata(metadata, awsMarketplaceMetadataDAO, awsMarketplace)

        SQSResult.Success(message)
    }
}

@Singleton
class AWSMarketplaceSQSConsumer @Inject constructor(
    private val sqs: AmazonSQSAsync,
    private val config: EnvironmentConfig,
    private val awsMarketplaceMetadataDAO: AWSMarketplaceMetadataDAO,
    private val awsMarketplace: AWSMarketplace
) : SQSConsumer(
    sqs,
    config.getEnv(EnvironmentVariable.AWSMarketplaceSubscriptionQueueURL),
    1,
    processMarketplaceMessage(awsMarketplaceMetadataDAO, awsMarketplace)
),
    ApplicationEventListener<ServiceReadyEvent> {
    private val logger = LoggerFactory.getLogger(javaClass)

    lateinit var consumer: AWSMarketplaceSQSConsumer
    override fun onApplicationEvent(event: ServiceReadyEvent) {
        logger.info("Starting AWSMarketplaceSQSConsumer from application event")
        consumer = AWSMarketplaceSQSConsumer(sqs, config, awsMarketplaceMetadataDAO, awsMarketplace).apply { start() }
    }
}

package ai.whylabs.songbird.health

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.sqs.AWSMarketplaceSQSConsumer
import ai.whylabs.songbird.sqs.SQSConsumer
import com.google.common.base.Suppliers
import io.micronaut.health.HealthStatus
import io.micronaut.management.health.indicator.AbstractHealthIndicator
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class SQSConsumerHealthIndicator @Inject constructor(
    marketplaceSqsConsumer: AWSMarketplaceSQSConsumer,
) : AbstractHealthIndicator<Map<String, Any?>>(), JsonLogging {

    private val consumers: List<SQSConsumer> = listOf(
        marketplaceSqsConsumer,
    )

    private val statusSupplier = Suppliers.memoizeWithExpiration(
        {
            consumers
                .map {
                    if (!it.started) {
                        it.start()
                    }
                    it.javaClass.simpleName to it.started
                }
                .toMap<String, Any?>()
        },
        300, // 5 minutes
        TimeUnit.SECONDS
    )

    override fun getHealthInformation(): Map<String, Any?> {
        val result = try {
            statusSupplier.get()
        } catch (e: Exception) {
            log.error("Failed to check SQS Consumer health", e)
            throw e
        }
        healthStatus = HealthStatus.UP

        return result
    }

    override fun getName(): String {
        return javaClass.simpleName
    }
}

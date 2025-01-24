package ai.whylabs.songbird.health

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB
import com.google.common.base.Suppliers
import io.micronaut.health.HealthStatus
import io.micronaut.management.health.indicator.AbstractHealthIndicator
import io.micronaut.management.health.indicator.annotation.Readiness
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Readiness
@Singleton
class DynamoDbHealthIndicator @Inject constructor(
    private val config: EnvironmentConfig,
    private val ddbClient: AmazonDynamoDB,
) : AbstractHealthIndicator<Map<String, Any?>>(), JsonLogging {

    private val statusSupplier = Suppliers.memoizeWithExpiration(
        {
            EnvironmentVariable.values()
                .filter { it.value.endsWith("_TABLE") }
                .map { config.getEnv(it) }
                .map { it to ddbClient.describeTable(it)?.sdkHttpMetadata?.allHttpHeaders }
                .toMap<String, Any?>()
        },
        300, // 5 minutes
        TimeUnit.SECONDS
    )

    override fun getHealthInformation(): Map<String, Any?> {
        val result = try {
            statusSupplier.get()
        } catch (e: Exception) {
            log.error("DynamoDB health failure", e)
            throw e
        }
        healthStatus = HealthStatus.UP

        return result
    }

    override fun getName(): String {
        return javaClass.simpleName
    }
}

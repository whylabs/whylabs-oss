package ai.whylabs.songbird.health

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.HeadBucketRequest
import com.google.common.base.Suppliers
import io.micronaut.health.HealthStatus
import io.micronaut.management.health.indicator.AbstractHealthIndicator
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class S3HealthIndicator @Inject constructor(
    private val s3: AmazonS3,
    private val config: EnvironmentConfig,
) : AbstractHealthIndicator<Map<String, Any?>>(), JsonLogging {

    private val statusSupplier = Suppliers.memoizeWithExpiration(
        {
            listOf(
                config.getEnv(EnvironmentVariable.StorageBucket)
            )
                .map { it to s3.headBucket(HeadBucketRequest(it)) }
                .toMap<String, Any?>()
        },
        300, // 5 minutes
        TimeUnit.SECONDS
    )

    override fun getHealthInformation(): Map<String, Any?> {
        val result = try {
            statusSupplier.get()
        } catch (e: Exception) {
            log.error("Failed to check S3 health", e)
            throw e
        }
        healthStatus = HealthStatus.UP

        return result
    }

    override fun getName(): String {
        return javaClass.simpleName
    }
}

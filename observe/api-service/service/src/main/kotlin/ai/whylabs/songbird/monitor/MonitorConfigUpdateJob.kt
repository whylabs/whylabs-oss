package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.cache.CacheKeyType
import ai.whylabs.songbird.cache.NullableJedisPool
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import com.amazonaws.services.s3.AmazonS3
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import jakarta.inject.Singleton
import redis.clients.jedis.params.ScanParams
import java.text.SimpleDateFormat
import java.util.Date

@Singleton
class MonitorConfigUpdateJob @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val jedisPool: NullableJedisPool,
    private val monitorConfigManager: MonitorConfigManager,
    private val organizationDAO: OrganizationDAO,
    private val s3: AmazonS3,
) : JsonLogging {

    @Scheduled(fixedDelay = "300s", initialDelay = "60s")
    fun flush() {
        try {
            jedisPool.get().resource.use { jedis ->
                var cursor = "0"
                var iterations = 0
                val pattern = "${CacheKeyType.MonitorConfigUpdate.prefix}*"
                do {
                    val scanResult = jedis.scan(cursor, ScanParams().match(pattern).count(200))
                    cursor = scanResult.cursor
                    scanResult.result.forEach { key ->
                        try {
                            val keyParts = key.split("#")
                            updateMonitorConfig(keyParts[1], keyParts[2])
                        } catch (e: Exception) {
                            // Ignore and delete because we don't want to try indefinitely - exception is logged in update
                        }
                        jedis.del(key)
                    }
                    iterations++
                } while (cursor != "0" && iterations < 10000)
                log.info("Completed flushing monitor config update cache with $iterations scan iterations.")
            }
        } catch (e: Exception) {
            log.warn("Failed to flush monitor config update cache. Exception: {}", e.message)
        }
    }

    fun updateMonitorConfig(orgId: String, datasetId: String) {
        val config = try {
            organizationDAO.checkExistence(orgId)
            monitorConfigManager.load(orgId, datasetId, includeEntitySchema = true, includeEntityWeights = true)
                .asJson()
        } catch (e: ResourceNotFoundException) {
            log.error("Failed monitor config task to update deleted or missing org $orgId dataset $datasetId.")
            throw e
        } catch (e: Exception) {
            log.error("Failed monitor config task to update monitor config for org $orgId dataset $datasetId. Unable to load config.", e)
            throw e
        }

        val bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket)
        val df = SimpleDateFormat("yyyy-MM-dd")
        val date = df.format(Date())
        val timestamp = System.currentTimeMillis().toString()
        val prefix = "${DownloadType.MonitorConfig.prefix}/$orgId/$datasetId"

        s3.putObject(
            bucket,
            "$prefix/$date/${String.format("%s_%s_%s", orgId, datasetId, timestamp)}.${DownloadType.MonitorConfig.suffix}",
            config,
        )

        // Engine requires the monitor configs sorted by date to only fetch the configs which have changed for a given time period
        s3.putObject(
            bucket,
            "${DownloadType.MonitorConfig.prefix}-date-ordered/$date/$orgId/$datasetId/${String.format("%s_%s_%s", orgId, datasetId, timestamp)}.${DownloadType.MonitorConfig.suffix}",
            config,
        )
    }
}

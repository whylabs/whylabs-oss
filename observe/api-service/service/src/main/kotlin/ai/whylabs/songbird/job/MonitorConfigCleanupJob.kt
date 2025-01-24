package ai.whylabs.songbird.job

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.MonitorConfigManager
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.S3DownloadParams
import com.amazonaws.AmazonServiceException
import com.amazonaws.SdkClientException
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.AmazonS3Exception
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class MonitorConfigCleanupJob @Inject constructor(
    private val env: EnvironmentConfig,
    private val s3: AmazonS3,
    private val monitorConfigManager: MonitorConfigManager
) : JsonLogging {

    private fun shouldExecute(bucket: String): Boolean {
        try {
            val lastModified = S3DownloadParams(bucket, HistoryLastModifiedPrefix).download(s3).toLong()
            if ((System.currentTimeMillis() - lastModified) > TimeUnit.MINUTES.toMillis(60L)) {
                return true
            }
        } catch (e: AmazonS3Exception) {
            log.error("Unable to check last update of monitor config cleanup", e)
            return true // first time running, file does not exist
        }

        return false
    }

    private fun setLastUpdate(bucket: String) {
        s3.putObject(bucket, HistoryLastModifiedPrefix, System.currentTimeMillis().toString())
    }

    @Scheduled(fixedDelay = "60m", initialDelay = "30s")
    fun execute() {
        val bucket = env.getEnv(EnvironmentVariable.StorageBucket)
        if (!shouldExecute(bucket)) {
            log.info("Not executing monitor config cleanup since it has been recently executed")
            return
        }

        setLastUpdate(bucket)
        val allConfigs = monitorConfigManager.listAll()

        allConfigs.forEach {
            val records = it.value.sortedByDescending { it.lastModified.time }.drop(VersionsToKeep)
            val iter = records.listIterator()
            while (iter.hasNext()) {
                try {
                    val obj = iter.next()
                    val copyKey = obj.key.replace(DownloadType.MonitorConfig.prefix + "/", HistoryPrefix)
                    log.info("Copying ${obj.key} to $copyKey")
                    s3.copyObject(bucket, obj.key, bucket, copyKey)
                    log.info("Deleting ${obj.key}")
                    s3.deleteObject(bucket, obj.key)
                } catch (e: AmazonServiceException) {
                    log.info("Copying key failed due to service exception: ${e.localizedMessage}")
                } catch (e: SdkClientException) {
                    log.info("Copying key failed due to sdk client exception: ${e.localizedMessage}")
                }
            }
        }
    }

    companion object {
        const val HistoryPrefix = "monitor-config-history/"
        const val HistoryLastModifiedPrefix = "monitor-config-history/last_modified"
        const val VersionsToKeep = 3
    }
}

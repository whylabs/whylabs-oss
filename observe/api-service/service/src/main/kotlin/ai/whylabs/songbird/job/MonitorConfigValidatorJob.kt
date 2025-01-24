package ai.whylabs.songbird.job

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.ConfigValidator
import ai.whylabs.songbird.monitor.MonitorConfigManager
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.S3ClientProvider
import ai.whylabs.songbird.util.S3DownloadParams
import ai.whylabs.songbird.v0.dao.ModelDAO
import com.amazonaws.services.s3.AmazonS3
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.text.SimpleDateFormat
import java.util.Date

@Singleton
class MonitorConfigValidatorJob @Inject constructor(
    private val env: EnvironmentConfig,
    private val s3: AmazonS3,
    private val monitorConfigManager: MonitorConfigManager,
    private val configValidator: ConfigValidator,
    private val s3ClientProvider: S3ClientProvider,
    private val modelDAO: ModelDAO,
) : JsonLogging {

    fun execute(s3Params: S3Params? = null, s3Bucket: String? = null) {
        val s3Client = s3Params?.let { s3ClientProvider.createCustomClient(it.accessKey, it.secretKey, it.region, it.sessionToken) } ?: s3
        val defaultBucket = env.getEnv(EnvironmentVariable.StorageBucket)
        val bucket = s3Bucket ?: defaultBucket

        val allConfigs = monitorConfigManager.listAll(bucket, s3Client)

        val results = allConfigs
            .filter {
                try {
                    // filter out deleted and invalid models
                    modelDAO.getModel(it.key.orgId, it.key.datasetId)
                    true
                } catch (e: Exception) {
                    log.info("Skipping model for ${it.key.orgId} ${it.key.datasetId}", e)
                    false
                }
            }.map { it ->
                val orgId = it.key.orgId
                val datasetId = it.key.datasetId
                log.info("Processing $orgId $datasetId")
                val record = it.value.maxByOrNull { it.lastModified.time }!!
                val downloadParams = S3DownloadParams(
                    bucket = bucket,
                    key = record.key,
                    downloadType = DownloadType.MonitorConfig,
                    logger = log,
                )
                val config = downloadParams.download(s3Client)
                val isValid = try {
                    configValidator.validateConfig(config, orgId, datasetId)
                    true
                } catch (e: Exception) {
                    false
                }
                Triple(orgId, datasetId, isValid)
            }

        val summary = results.sortedWith(compareBy({ it.third }, { it.first }, { it.second }))
            .joinToString("\n") { (if (it.third) "[VALID] " else "[INVALID] ") + it.first + ", " + it.second }

        log.info("Writing summary to s3://$bucket/monitor-config-validation/")
        writeSummaryToS3(summary, defaultBucket)
    }

    private fun writeSummaryToS3(summary: String, bucket: String) {
        val df = SimpleDateFormat("yyyy-MM-dd")
        val date = df.format(Date())
        // makes sure that we use the env client and write the validation report to the default env bucket
        s3.putObject(bucket, "monitor-config-validation/$date/${System.currentTimeMillis()}", summary)
    }
}

data class S3Params(
    val accessKey: String,
    val secretKey: String,
    val region: String,
    val sessionToken: String,
)

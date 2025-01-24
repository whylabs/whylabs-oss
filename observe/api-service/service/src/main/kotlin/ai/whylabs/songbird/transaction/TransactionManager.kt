package ai.whylabs.songbird.transaction

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceException
import ai.whylabs.songbird.util.LogUtil
import ai.whylabs.songbird.util.RegionBucket
import ai.whylabs.songbird.util.UploadType
import ai.whylabs.songbird.util.toDateString
import ai.whylabs.songbird.v0.controllers.AsyncLogResponse
import ai.whylabs.songbird.v0.controllers.WhyLabsFileExtension
import ai.whylabs.songbird.v0.dao.LogTransactionDAO
import ai.whylabs.songbird.v0.dao.LogTransactionMetadata
import ai.whylabs.songbird.v0.ddb.LogTransactionKey
import ai.whylabs.songbird.v0.ddb.LogTransactionMetadataItem
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v1.controllers.TransactionLogRequest
import com.amazonaws.services.s3.AmazonS3
import com.github.michaelbull.retry.policy.limitAttempts
import com.github.michaelbull.retry.retry
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.nio.file.Paths
import java.time.Instant
import java.util.Calendar
import java.util.Date
import java.util.UUID

@Singleton
class TransactionManager @Inject constructor(
    config: EnvironmentConfig,
    private val logTransactionDAO: LogTransactionDAO,
    private val logUtil: LogUtil,
    private val s3: AmazonS3,
) : JsonLogging {
    private val storageBucket = config.getEnv(EnvironmentVariable.StorageBucket)

    suspend fun createTransaction(orgId: String, datasetId: String): LogTransactionMetadata {
        val transactionMetadata = retry(limitAttempts(3)) {
            val transactionId = UUID.randomUUID().toString()
            val currentTime = Date()
            val c = Calendar.getInstance()
            c.time = currentTime
            c.add(Calendar.DATE, 3)
            val expirationTime = c.time
            val summaries = s3.listObjects(storageBucket, "${UploadType.PresignedTransactionLogEntry.prefix}/$transactionId").objectSummaries
            if (summaries.isNotEmpty()) {
                // Transaction ID already used
                throw IllegalArgumentException("Invalid transaction id generated")
            }
            val item = LogTransactionMetadataItem(
                key = LogTransactionKey(transactionId),
                orgId = orgId,
                datasetId = datasetId,
                transactionId = transactionId,
                expirationTime = expirationTime,
            )
            logTransactionDAO.create(item)
        }
        return transactionMetadata
    }

    fun logTransaction(orgId: String, transactionId: String, apiKeyId: String, request: TransactionLogRequest, fileExtension: WhyLabsFileExtension?): AsyncLogResponse {
        val transaction = loadTransaction(orgId, transactionId)
        val segments = Segment(request.segmentTags)
        val bucketOverride = RegionBucket.fromRegion(request.region)
        if (request.region != null && bucketOverride == null) {
            throw IllegalArgumentException("Unsupported region provided: ${request.region}. Remove the requested region to use the default.")
        }
        return logUtil.logAsyncProfile(
            orgId = orgId,
            datasetId = transaction.datasetId,
            transactionId = transaction.transactionId,
            datasetTimestamp = request.datasetTimestamp,
            segments = segments,
            apiKeyId = apiKeyId,
            bucketOverride = bucketOverride,
            uploadType = UploadType.PresignedTransactionLogEntry,
            fileExtension = fileExtension
        )
    }

    fun abortTransaction(orgId: String, transactionId: String) {
        val transaction = loadTransaction(orgId, transactionId)
        try {
            logTransactionDAO.update(logTransactionDAO.toItem(transaction.copy(aborted = true)))
        } catch (e: Exception) {
            log.error("Failed to abort transaction $transactionId", e)
            throw ResourceException("transaction", transactionId) { "Failed to abort transaction" }
        }
    }

    fun transactionStatus(orgId: String, transactionId: String): List<String> {
        val transaction = loadTransaction(orgId, transactionId)
        val transactionPrefix = UploadType.PresignedTransactionLogEntry.prefix + "/${transaction.transactionId}"
        return s3.listObjects(storageBucket, transactionPrefix)
            .objectSummaries
            .map { Paths.get(it.key).fileName.toString() }
            .filter { !it.endsWith(".json") } // filter out the metadata
    }

    fun commitTransaction(orgId: String, transactionId: String) {
        val transaction = loadTransaction(orgId, transactionId)
        if (transaction.aborted == true) {
            throw ResourceException("transaction", transactionId) { "Transaction has been aborted" }
        }

        // TODO: move this s3 copy to a SQS processor
        val transactionPrefix = "${UploadType.PresignedTransactionLogEntry.prefix}/${transaction.transactionId}"
        val today = Instant.now().toDateString()
        s3.listObjects(storageBucket, transactionPrefix)
            .objectSummaries
            .forEach {
                val destination = it.key.replace(transactionPrefix, "${UploadType.PresignedDailyLogEntry.prefix}/$today")
                log.info("Transaction commit: copying ${it.key} to $destination")
                s3.copyObject(storageBucket, it.key, storageBucket, destination)
            }

        logTransactionDAO.delete(logTransactionDAO.toItem(transaction))
    }

    private fun loadTransaction(orgId: String, transactionId: String): LogTransactionMetadata {
        val item = LogTransactionMetadataItem(
            key = LogTransactionKey(transactionId),
        )
        val transaction = logTransactionDAO.load(item)
            ?: throw IllegalArgumentException("Transaction has expired or does not exist")
        if (transaction.orgId != orgId) {
            // Transaction does not belong to this organization
            throw IllegalArgumentException("Transaction does not exist")
        }
        return transaction
    }
}

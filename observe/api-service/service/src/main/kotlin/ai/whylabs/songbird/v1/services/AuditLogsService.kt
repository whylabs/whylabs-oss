package ai.whylabs.songbird.v1.services

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.AuditLogsDAO
import ai.whylabs.songbird.v0.models.AuditLog
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.ObjectMetadata
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.io.PipedInputStream
import java.io.PipedOutputStream

@Singleton
class AuditLogsService @Inject constructor(
    private val auditLogsDAO: AuditLogsDAO,
    private val s3: AmazonS3,
    config: EnvironmentConfig
) : JsonLogging {
    private val bucketName = config.getEnv(EnvironmentVariable.AuditLogsExportBucket)
    fun dump(
        accountId: String,
        startDate: String?,
        endDate: String?,
        limit: Long?,
        offset: Long?,
        eventName: String?,
        statusCode: String?,
        principalId: String?,
        identityId: String?
    ) {
        log.debug("Querying audit logs for orgId: $accountId")
        val auditLogs: Sequence<AuditLog> = auditLogsDAO.query(
            accountId,
            startDate,
            endDate,
            limit,
            offset,
            eventName,
            statusCode,
            principalId,
            identityId
        )

        // write to s3 as a stream of bytes
        val now = System.currentTimeMillis()
        val prefix = "audit-logs/$accountId/$now.json"
        log.debug("Writing audit logs to $bucketName/audit-logs/$accountId/$now.json")

        writeAuditLogsToS3(bucketName, prefix, auditLogs)
    }

    private fun writeAuditLogsToS3(
        bucketName: String,
        prefix: String,
        auditLogs: Sequence<AuditLog>
    ) = runBlocking {
        val channel = Channel<AuditLog>(capacity = 100)
        val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

        PipedOutputStream().use { outputStream ->
            PipedInputStream(outputStream).use { inputStream ->
                val metadata = ObjectMetadata().apply { contentType = "application/json" }

                val uploadJob = scope.launch {
                    try {
                        // if this becomes a perf bottleneck, an alternative would be to use TransferManager, which adds
                        // a bit of complexity but can be more efficient for large query results.
                        s3.putObject(bucketName, prefix, inputStream, metadata)
                    } catch (e: Exception) {
                        log.error("Failed to upload audit logs to S3", e)
                    }
                }

                scope.launch {
                    outputStream.bufferedWriter().use { writer ->
                        writer.write("[")
                        auditLogs.forEachIndexed { index, auditLog ->
                            if (index > 0) writer.write(",")
                            writer.write(jacksonObjectMapper().writeValueAsString(auditLog))
                        }
                        writer.write("]")
                    }
                }

                auditLogs.forEach { channel.send(it) }
                channel.close()

                uploadJob.join()
            }
        }
    }
}

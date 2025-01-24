package ai.whylabs.songbird.util

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.EnvironmentVariable.CfKeyPairId
import ai.whylabs.songbird.EnvironmentVariable.CfLogDomain
import ai.whylabs.songbird.logging.SongbirdLogger
import ai.whylabs.songbird.v0.controllers.WhyLabsFileExtension
import ai.whylabs.songbird.v0.models.Segment
import com.amazonaws.HttpMethod
import com.amazonaws.services.cloudfront.CloudFrontUrlSigner
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest
import com.amazonaws.services.s3.model.ObjectMetadata
import com.amazonaws.services.s3.model.ObjectTagging
import com.amazonaws.services.s3.model.PutObjectRequest
import com.amazonaws.services.s3.model.S3Object
import com.amazonaws.services.s3.model.Tag
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import java.io.BufferedReader
import java.io.File
import java.io.InputStream
import java.net.URI
import java.security.PrivateKey
import java.time.Duration
import java.time.Instant

enum class DownloadType(val prefix: String, val suffix: String) {
    Unknown("unspecified", "data"),
    MonitorConfig("monitor-config-v3", "json"),
    MonitorConfigHistory("monitor-config-history", "json"),
    MonitorSchema("monitor-schema", "json"),
    PresignedDailyLogEntry("daily-log-untrusted", "bin"),
    ReferenceProfileEntry("reference-profiles", "bin"),
}

enum class UploadType(val prefix: String, val suffix: String) {
    Asset("", ""), // prefix and suffix are empty because they aren't used
    Event("events", "json"),
    Alert("alerts", "json"),
    RequestMonitorRunConfig("backfill", "json"),
    DeleteProfileRequestConfig("delete", "json"),
    DeleteAnalyzerResultsRequestConfig("delete", "json"),
    ProfileProtobuf("profiles", "bin"),
    ProfileSummary("profiles", "json"),
    SummarizedProfileProtobuf("summarized", "bin"),
    SummarizedProfileSummary("summarized", "json"),
    DailyLogEntry("daily-log", "bin"),
    ReferenceProfileEntry("reference-profiles", "bin"),
    PresignedDailyLogEntry("daily-log-untrusted", ""),
    PresignedTransactionLogEntry("transaction-log-untrusted", ""),
    AnonymousSession("session-log", "bin"),
    Unknown("unspecified", "data"),

    // TODO: support hourly and 'non-batch' (not sure what this should be called)
    HourlyLogEntry("hourly-log", "bin"),
    NonbatchLogEntry("nonbatch-log", "bin"),
}

data class S3UploadResult(val bucket: String, val key: String, val eTag: String) {
    fun toUri(): String = "s3://$bucket/$key"
}

data class S3GetDownloadUrlResult(val url: String, val key: String)

data class S3GetUploadUrlResult(val url: String, val key: String)
data class S3GetUploadUrlMetadata(
    val id: String?,
    val orgId: String,
    val datasetId: String,
    val datasetTimestamp: Long?,
    val uploadKeyId: String,
    val tags: Segment?,
    val idempotencyKey: String?,
    val alias: String?,
)

sealed class UploadContent {
    data class InputStreamContent(val inputStream: InputStream) : UploadContent()
    data class FileContent(val localFile: File) : UploadContent()
    data class StringContent internal constructor(val content: String) : UploadContent()
}

data class S3DownloadParams(
    val bucket: String,
    val key: String,
    val downloadType: DownloadType = DownloadType.Unknown,
    val logger: SongbirdLogger? = null,
) {
    fun download(s3: AmazonS3): String {
        val obj: S3Object = s3.getObject(bucket, key)
        val inputStream = obj.objectContent.delegateStream
        val reader = BufferedReader(inputStream.reader())
        val content = StringBuilder()
        reader.use { r ->
            var line = r.readLine()
            while (line != null) {
                content.append(line)
                line = r.readLine()
            }
        }
        return content.toString()
    }

    fun createPresignedDownload(
        s3: AmazonS3,
    ): S3GetDownloadUrlResult {
        val allowedDownloadTypes = setOf(
            DownloadType.ReferenceProfileEntry,
            DownloadType.PresignedDailyLogEntry
        )

        if (downloadType !in allowedDownloadTypes) {
            throw IllegalArgumentException("Invalid download type. Got: $downloadType")
        }

        val expirationTime = Instant.now().plus(Duration.ofMinutes(15)).toDate()
        val presignedUrlRequest = GeneratePresignedUrlRequest(bucket, key).apply {
            method = HttpMethod.GET
            expiration = expirationTime
        }
        val signedUrl = s3.generatePresignedUrl(presignedUrlRequest).toString()

        return S3GetDownloadUrlResult(
            url = signedUrl,
            key = key
        )
    }
}

data class S3UploadParams(
    val bucket: String,
    val orgId: String,
    val modelId: String,
    val datasetTimestamp: Long?,
    val config: EnvironmentConfig,
    val uploadType: UploadType = UploadType.Unknown,
    val uploadContent: UploadContent? = null,
    val logger: SongbirdLogger? = null,
    val tags: Segment? = null,
    val shouldUseCloudFront: Boolean = false,
    val transactionId: String? = null,
) {
    private val mapper = jacksonObjectMapper()
    private val cfDomain = config.getEnv(CfLogDomain)
    private val cfKeyId = config.getEnv(CfKeyPairId)

    private fun getS3Path(uploadType: UploadType): String {
        val instant = datasetTimestamp?.let { Instant.ofEpochMilli(it) } ?: Instant.now()
        val dataTimestamp = instant.toISOString().replace(":", "")
        val today = Instant.now().toDateString()
        val randomId = RandomUtils.newId(len = 32)

        return when (uploadType) {
            // for files validated by our API with metadata
            UploadType.DailyLogEntry -> {
                // we want to use today so we can always ingest latest data, and the data timestamp is
                // for debugging
                "${uploadType.prefix}/$today/$orgId-$modelId-$dataTimestamp-$randomId.${uploadType.suffix}"
            }
            // for upload files untrusted by the users. We only return a prefix
            UploadType.PresignedDailyLogEntry -> {
                // Get the prefix name from env, defaulting to a hard coded one if we can't for dev convenience.
                // This comes from env because we need to share the name of the prefix with other things in infra.
                val prefix = config.getEnv(
                    EnvironmentVariable.StorageBucketUntrustedPrefix,
                    uploadType.prefix
                )
                "$prefix/$today/$orgId-$modelId-$dataTimestamp-$randomId"
            }
            // for reference profiles. Structured so we can consume from deltalake
            UploadType.ReferenceProfileEntry -> {
                "${uploadType.prefix}/$today/$orgId-$modelId-$randomId"
            }
            UploadType.RequestMonitorRunConfig -> {
                "actions/${uploadType.prefix}/$orgId-$modelId.${uploadType.suffix}"
            }
            UploadType.PresignedTransactionLogEntry -> {
                if (transactionId == null) {
                    throw IllegalArgumentException("Must supply transaction id for PresignedTransactionLogEntry")
                }
                "${uploadType.prefix}/$transactionId/$orgId-$modelId-$dataTimestamp-$randomId"
            }
            // everything else is based on org-model ID so we can wipe out the whole prefix (TBD)
            else -> {
                "${uploadType.prefix}-$orgId/$modelId/$dataTimestamp-$randomId.${uploadType.suffix}"
            }
        }
    }

    private fun getS3UploadRequest(
        s3Path: String,
        content: UploadContent,
        uploadType: UploadType,
        metadata: ObjectMetadata = ObjectMetadata(),
        bucketOverride: String? = null,
    ): PutObjectRequest {
        val tagging = ObjectTagging(
            listOf(
                Tag("orgId", orgId),
                Tag("data_type", uploadType.name),
                Tag("datasetId", modelId)
            )
        )

        return when (content) {
            is UploadContent.InputStreamContent -> PutObjectRequest(
                bucketOverride ?: bucket,
                s3Path,
                content.inputStream,
                metadata
            )
            is UploadContent.FileContent -> PutObjectRequest(bucketOverride ?: bucket, s3Path, content.localFile)
            is UploadContent.StringContent -> PutObjectRequest(
                bucketOverride ?: bucket,
                s3Path,
                content.content.byteInputStream(),
                metadata
            )
        }.apply {
            withTagging(tagging)
            withMetadata(metadata)
        }
    }

    private fun checkValidPreSignedUploadType() {
        val presignedUploadTypes =
            setOf(
                UploadType.Asset,
                UploadType.DailyLogEntry,
                UploadType.PresignedDailyLogEntry,
                UploadType.ReferenceProfileEntry,
                UploadType.PresignedTransactionLogEntry,
            )
        if (uploadType !in presignedUploadTypes) {
            throw IllegalArgumentException("Invalid upload type. Got: $uploadType")
        }
    }

    fun createUploadMetadata(
        s3: AmazonS3,
        bucket: String,
        apiKeyId: String,
        id: String? = null,
        idempotencyKey: String? = null,
        alias: String? = null // expected to be set only on reference profiles.
    ): String {
        checkValidPreSignedUploadType()
        var s3Prefix: String = getS3Path(uploadType)
        loop@ for (i in 1..4) {
            val jsonKey = "$s3Prefix.json"
            if (!s3.doesObjectExist(bucket, jsonKey)) {
                s3.putObject(
                    bucket,
                    jsonKey,
                    InputStream.nullInputStream(),
                    ObjectMetadata().apply { contentLength = 0 }
                )
                break@loop
            } else if (i == 4) {
                throw IllegalStateException("Failed to find a random S3 prefix for JSON key")
            }
            logger?.debug("S3 prefix $s3Prefix exists. Retrying with another")
            s3Prefix = getS3Path(uploadType)
        }

        // Create the s3 json file that contains metadata about this upload
        val metadata = S3GetUploadUrlMetadata(
            id = id,
            orgId = orgId,
            datasetId = modelId,
            datasetTimestamp = datasetTimestamp,
            tags = tags,
            uploadKeyId = apiKeyId,
            idempotencyKey = idempotencyKey,
            alias = alias,
        )
        val content = mapper.writeValueAsString(metadata)
        val contentSize = content.toByteArray().size.toLong()

        val request = getS3UploadRequest(
            "$s3Prefix.json",
            UploadContent.StringContent(content),
            UploadType.PresignedDailyLogEntry,
            metadata = ObjectMetadata().apply { contentLength = contentSize },
            bucketOverride = bucket
        )
        val uploadResult = s3.putObject(request)

        // Log results
        logger?.info {
            msg("Uploaded data for path: $s3Prefix")
            meta(
                "orgId" to orgId,
                "modelId" to modelId,
                "metadata" to uploadResult.metadata.rawMetadata.toString()
            )
        }

        return s3Prefix
    }

    fun createPresignedUpload(
        s3: AmazonS3,
        s3Prefix: String,
        cfPrivateKey: PrivateKey? = null,
        fileExtension: WhyLabsFileExtension? = null,
        overrideFileKey: String? = null,
        overrideUri: String? = null,
        expirationInMinutes: Long? = null,
    ): S3GetUploadUrlResult {
        checkValidPreSignedUploadType()
        val binaryKey = overrideFileKey ?: fileExtension?.let { "$s3Prefix.${it.name.lowercase()}" } ?: "$s3Prefix.bin"

        val expirationTime = Instant.now().plus(Duration.ofMinutes(expirationInMinutes ?: 15)).toDate()
        val signedUrl = if (shouldUseCloudFront) {
            CloudFrontUrlSigner.getSignedURLWithCannedPolicy(
                "https://$cfDomain/$binaryKey",
                cfKeyId,
                cfPrivateKey,
                expirationTime
            )
        } else {
            val presignedUrlRequest = GeneratePresignedUrlRequest(bucket, binaryKey).apply {
                method = HttpMethod.PUT
                expiration = expirationTime
            }
            s3.generatePresignedUrl(presignedUrlRequest).toString()
        }

        val uploadUrl = if (overrideUri.isNullOrBlank()) {
            signedUrl
        } else {
            // if the override uri is set on the organization metadata, we need to replace the url but include the signed path and query params
            val signedUri = URI(signedUrl)
            val uploadUriOverride = URI(overrideUri)
            uploadUriOverride.toURL().toString() + signedUri.rawPath + "?${signedUri.rawQuery}"
        }

        return S3GetUploadUrlResult(
            url = uploadUrl,
            key = binaryKey
        )
    }

    fun upload(s3: AmazonS3): S3UploadResult {
        if (uploadContent == null) {
            throw IllegalArgumentException("Must supply an UploadContent to upload to s3.")
        }

        val s3Path = getS3Path(uploadType)
        val request = getS3UploadRequest(s3Path, uploadContent, uploadType)

        val res = s3.putObject(request)
        logger?.info {
            msg("Uploaded data for path: s3://$bucket/$s3Path")
            meta(
                "orgId" to orgId,
                "modelId" to modelId,
                "metadata" to res.metadata.rawMetadata.toString()
            )
        }

        return S3UploadResult(bucket, s3Path, res.eTag)
    }
}

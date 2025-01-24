package ai.whylabs.songbird.util

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.subscription.SubscriptionValidator
import ai.whylabs.songbird.util.RandomUtils.newId
import ai.whylabs.songbird.v0.controllers.AsyncLogResponse
import ai.whylabs.songbird.v0.controllers.LogReferenceRequest
import ai.whylabs.songbird.v0.controllers.LogReferenceResponse
import ai.whylabs.songbird.v0.controllers.WhyLabsFileExtension
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.ReferenceProfileItem
import ai.whylabs.songbird.v0.models.Segment
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.s3.AmazonS3URI
import io.micrometer.core.instrument.MeterRegistry
import jakarta.inject.Inject
import jakarta.inject.Named
import jakarta.inject.Singleton
import java.security.PrivateKey
import java.time.Instant

@Singleton
class LogUtil @Inject constructor(
    private val modelDAO: ModelDAO,
    private val organizationDAO: OrganizationDAO,
    private val s3ClientProvider: S3ClientProvider,
    private val subscriptionValidator: SubscriptionValidator,
    private val ddbMapper: DynamoDBMapper,
    private val config: EnvironmentConfig,
    private val meterRegistry: MeterRegistry,
    @Named("LogCloudFront") private val cfPrivateKey: PrivateKey,
) : JsonLogging {
    private val storageBucket = config.getEnv(EnvironmentVariable.StorageBucket)

    fun logReference(
        orgId: String,
        modelId: String,
        body: LogReferenceRequest,
        apiKeyId: String,
        bucketOverride: RegionBucket? = null,
        fileExtension: WhyLabsFileExtension? = null,
    ): LogReferenceResponse {
        // Make sure the org/model exist
        modelDAO.getModel(orgId, modelId)

        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        val destinationOverride = bucketOverride?.uri
            ?: if (!org.storageBucketOverride.isNullOrEmpty()) {
                AmazonS3URI(org.storageBucketOverride)
            } else {
                null
            }
        val datasetTimestamp = body.datasetTimestamp ?: Instant.now().toEpochMilli()

        // Create DDB entry with presumably unique ID
        val item = when (body.alias) {
            null -> {
                ReferenceProfileItem(
                    orgId = orgId,
                    modelId = modelId,
                    datasetTimestamp = datasetTimestamp.toDate(),
                )
            }
            else -> {
                ReferenceProfileItem(
                    alias = body.alias,
                    orgId = orgId,
                    modelId = modelId,
                    datasetTimestamp = datasetTimestamp.toDate(),
                )
            }
        }

        val params = S3UploadParams(
            bucket = destinationOverride?.bucket ?: storageBucket,
            orgId = orgId,
            modelId = modelId,
            datasetTimestamp = datasetTimestamp,
            uploadType = UploadType.ReferenceProfileEntry,
            logger = log,
            config = config
        )

        // Always store .json metadata in default region (us-west-2)
        val s3Prefix = params.createUploadMetadata(s3ClientProvider.client(), config.getEnv(EnvironmentVariable.StorageBucket), apiKeyId, id = item.key.referenceId)
        val result = params.createPresignedUpload(
            s3ClientProvider.client(destinationOverride?.region),
            s3Prefix = s3Prefix,
            fileExtension = fileExtension,
            overrideUri = org.storageUriOverride,
        )

        // TODO: retry here if the save fails the condition checks
        ddbMapper.save(item.copy(path = result.key), DdbExpressions.ShouldNotExistSaveExpr)

        return LogReferenceResponse(
            alias = item.alias,
            id = item.key.referenceId,
            modelId = modelId,
            uploadTimestamp = datasetTimestamp,
            uploadUrl = result.url,
        )
    }

    fun logAsyncProfile(
        orgId: String,
        datasetId: String,
        datasetTimestamp: Long,
        segments: Segment,
        apiKeyId: String,
        bucketOverride: RegionBucket? = null,
        transactionId: String? = null,
        uploadType: UploadType = UploadType.PresignedDailyLogEntry,
        fileExtension: WhyLabsFileExtension? = null,
        idempotencyKey: String? = null,
    ): AsyncLogResponse {
        // Make sure the org/model exist
        val model = modelDAO.getModel(orgId, datasetId)

        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        val destinationOverride = bucketOverride?.uri
            ?: if (!org.storageBucketOverride.isNullOrEmpty()) {
                AmazonS3URI(org.storageBucketOverride)
            } else {
                null
            }
        subscriptionValidator.validate(org)

        if (model.active == false) {
            throw IllegalStateException("Model ${model.id} is inactive.")
        }

        val params = S3UploadParams(
            bucket = destinationOverride?.bucket ?: storageBucket,
            orgId = orgId,
            modelId = datasetId,
            datasetTimestamp = datasetTimestamp,
            uploadType = uploadType,
            logger = log,
            tags = segments,
            config = config,
            shouldUseCloudFront = org.shouldUseCloudFront(),
            transactionId = transactionId
        )

        // Always store .json metadata in default region (us-west-2)
        val s3Prefix = params.createUploadMetadata(s3ClientProvider.client(), config.getEnv(EnvironmentVariable.StorageBucket), apiKeyId, id = null, idempotencyKey = idempotencyKey)
        val result = params.createPresignedUpload(
            s3ClientProvider.client(destinationOverride?.region),
            s3Prefix = s3Prefix,
            cfPrivateKey = cfPrivateKey,
            fileExtension = fileExtension,
            overrideUri = org.storageUriOverride,
        )
        val logEntryId = newId("log")
        meterRegistry.counter("Requests.Profile.LogAsync").increment()
        log.info("Created log entry with id $logEntryId for org $orgId, model $datasetId, datasetTimestamp $datasetTimestamp")

        return AsyncLogResponse(
            id = logEntryId,
            modelId = datasetId,
            uploadTimestamp = datasetTimestamp,
            uploadUrl = result.url,
            tags = segments
        )
    }
}

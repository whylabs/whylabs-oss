@file:Suppress("RedundantSuspendModifier")

package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsFileExtensionHeader
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsIdempotencyKeyHeader
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.request.IdempotencyKeyAttributes
import ai.whylabs.songbird.request.IdempotentRequestManager
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteDataRole
import ai.whylabs.songbird.security.ValidatedIdentity
import ai.whylabs.songbird.security.getKey
import ai.whylabs.songbird.subscription.SubscriptionValidator
import ai.whylabs.songbird.util.DeleteOnCloseTempFile
import ai.whylabs.songbird.util.DeleteOnCloseTempFile.Companion.toTempFile
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.ExampleSegmentJson
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.util.LogUtil
import ai.whylabs.songbird.util.ObservatoryLinks
import ai.whylabs.songbird.util.OrgUtils
import ai.whylabs.songbird.util.ProfileId
import ai.whylabs.songbird.util.S3UploadParams
import ai.whylabs.songbird.util.S3UploadResult
import ai.whylabs.songbird.util.UploadContent
import ai.whylabs.songbird.util.UploadType
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.DdbUtils.retry
import ai.whylabs.songbird.v0.ddb.LogEntryItem
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.SegmentTag
import ai.whylabs.songbird.v0.models.SegmentTagsAnnotation
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import com.amazonaws.services.s3.AmazonS3Client
import com.whylogs.core.message.DatasetProfileMessage
import io.micrometer.core.lang.Nullable
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Header
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.multipart.StreamingFileUpload
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject
import jakarta.inject.Named
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.PrivateKey
import java.time.Instant
import java.time.temporal.ChronoUnit

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/log")
@Tag(name = "Log", description = "Endpoint for logging dataset profiles")
@Secured(AdministratorRole, UserRole)
class LogController @Inject constructor(
    private val config: EnvironmentConfig,
    private val s3: AmazonS3Client,
    private val modelDAO: ModelDAO,
    private val organizationDAO: OrganizationDAO,
    private val subscriptionValidator: SubscriptionValidator,
    private val idempotentRequestManager: IdempotentRequestManager,
    private val ddbMapper: DynamoDBMapper,
    private val logUtil: LogUtil,
    private val orgUtils: OrgUtils,
    private val observatoryLinks: ObservatoryLinks,
    @Named("LogCloudFront") private val cfPrivateKey: PrivateKey,
) : JsonLogging {
    private val storageBucket = config.getEnv(EnvironmentVariable.StorageBucket)

    @AuditableResponseBody
    @Operation(
        operationId = "LogAsync",
        summary = "Like /log, except this api doesn't take the actual profile content. It returns an upload link that can be used to upload the profile to.",
        description = "Like /log, except this api doesn't take the actual profile content. It returns an upload link that can be used to upload the profile to.",
    )
    @Post(
        uri = "/async/{dataset_id}",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    suspend fun logAsync(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) dataset_id: String,
        @Schema(hidden = true, required = false)
        @Header(WhyLabsIdempotencyKeyHeader) idempotency_key: String?,
        @Schema(hidden = true, required = false)
        @Header(WhyLabsFileExtensionHeader) file_extension: String?,
        @Body body: LogAsyncRequest,
        @Nullable authentication: Authentication,
    ): AsyncLogResponse {
        if (!idempotentRequestManager.isIdempotentRequest(idempotency_key)) {
            log.warn("Failed Idempotent request. Idempotency key: $idempotency_key")
            throw IllegalArgumentException("Failed Idempotent request. Idempotency key: $idempotency_key")
        }
        if (getValidatedIdentity()?.allowed(dataset_id) == false) {
            throw IllegalArgumentException("Log for this resource is not allowed for this authentication.")
        }
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(org_id) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }

        // Make sure the org/model exist
        modelDAO.getModel(org_id, dataset_id)
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        subscriptionValidator.validate(org)
        val bucketOverride = org.resolveRegionBucket(body.region)
        if (body.region != null && bucketOverride == null) {
            throw IllegalArgumentException("Unsupported region provided: ${body.region}. Remove the requested region to use the default.")
        }

        val datasetTimestamp = body.datasetTimestamp
        val datasetTime = Instant.ofEpochMilli(datasetTimestamp)
        val earliestSupportedTime = Instant.now().minus(5 * 365, ChronoUnit.DAYS)
        if (datasetTime.isBefore(earliestSupportedTime)) {
            throw IllegalArgumentException("Dataset timestamp cannot be more than 5 years ago.")
        }
        val segments = Segment(body.segmentTags)
        val key: ValidatedIdentity = authentication.getKey()
        val fileType: WhyLabsFileExtension = WhyLabsFileExtension.valueOf(file_extension ?: "BIN")

        val response = logUtil.logAsyncProfile(
            org_id,
            dataset_id,
            datasetTimestamp,
            segments,
            key.identityId,
            bucketOverride = bucketOverride,
            fileExtension = fileType,
            idempotencyKey = idempotency_key
        )
        if (!idempotency_key.isNullOrEmpty()) {
            idempotentRequestManager.setIdempotentRequestProperties(
                idempotency_key,
                IdempotencyKeyAttributes(
                    key = idempotency_key,
                    orgId = org_id,
                    datasetId = dataset_id,
                )
            )
        }

        return response
    }

    @Deprecated(
        "This operation is deprecated",
        replaceWith = ReplaceWith("DatasetProfile.CreateReferenceProfile")
    )
    @AuditableResponseBody
    @Operation(
        operationId = "LogReference",
        summary = "Returns a presigned URL for uploading the reference profile to.",
        description = "Reference profiles can be used for.",
    )
    @Post(
        uri = "/reference/{model_id}",
        consumes = [MediaType.APPLICATION_JSON],
        produces = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    suspend fun logReference(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @Body body: LogReferenceRequest,
        @Nullable authentication: Authentication,
    ): LogReferenceResponse {
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(org_id) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }

        val key: ValidatedIdentity = authentication.getKey()
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val bucketOverride = org.resolveRegionBucket(body.region)
        if (body.region != null && bucketOverride == null) {
            throw IllegalArgumentException("Unsupported region provided: ${body.region}. Remove the requested region to use the default.")
        }

        return logUtil.logReference(org_id, model_id, body, key.identityId, bucketOverride = bucketOverride)
    }

    @Operation(
        operationId = "GetProfileObservatoryLink",
        summary = "Get observatory links for profiles in a given org/model. A max of 3 profiles can be viewed a a time.",
        description = "Get observatory links for profiles in a given org/model. A max of 3 profiles can be viewed a a time.",
    )
    @SecurityRequirement(name = ApiKeyAuth)
    @Secured(SecurityValues.UserRole)
    @Post(uri = "/observatory-link/{dataset_id}", produces = [MediaType.APPLICATION_JSON])
    fun getObservatoryLink(
        dataset_id: String,
        org_id: String,
        @Body body: GetProfileObservatoryLinkRequest
    ): GetProfileObservatoryLinkResponse {
        val dataset = modelDAO.getModel(org_id, dataset_id)
        val granularity = dataset.timePeriod.toGranularity()

        val ids =
            body.referenceProfileIds.map { ProfileId.ReferenceId(it) } +
                body.batchProfileTimestamps.map {
                    ProfileId.BatchProfileTimestamp(it, granularity)
                }

        val observatoryUrl = observatoryLinks.profileViewerLink(dataset_id, ids)
        val individualUrls = ids.map {
            observatoryLinks.profileViewerLink(dataset_id, listOf(it))
        }

        return GetProfileObservatoryLinkResponse(observatoryUrl, individualUrls)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param model_id The unique model ID in your company.
     * @param segment_tags The segment associated with the log entry. Not required if segment tags are specified in whylogs
     * @param dataset_timestamp The dataset timestamp associated with the entry. Not required. However, this will
     * override the whylogs dataset timestamp if specified
     * @param file The Dataset Profile log entry
     * @return a LogResponse object if succeeds
     */
    @Deprecated(
        "This operation is deprecated",
        replaceWith = ReplaceWith("logAsync")
    )
    @Operation(
        operationId = "Log",
        summary = "Log a dataset profile entry to the backend",
        description = "This method returns a [LogResponse] object if it succeeds",
        tags = ["Internal"],
    )
    @Post(
        uri = "/",
        consumes = [MediaType.MULTIPART_FORM_DATA],
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun log(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleStartMilli) dataset_timestamp: Long?,
        @QueryValue @SegmentTagsAnnotation segment_tags: List<SegmentTag>?,
        @QueryValue @Schema(example = ExampleSegmentJson) segment_tags_json: String?,
        @Schema(required = true) file: StreamingFileUpload,
    ): LogResponse {
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(org_id) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }
        val model = modelDAO.getModel(org_id, model_id)
        log.info {
            msg { "Uploading for $org_id/$model_id." }
            meta("orgId" to org_id, "modelId" to model_id)
        }
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        subscriptionValidator.validate(org)

        if (model.active == false) {
            throw IllegalStateException("Model ${model.id} is inactive.")
        }

        val updatedFile = file.toTempFile().use {
            val localFile = it.toFile()
            updateFileMetadata(
                original = localFile,
                orgId = org_id,
                datasetId = model_id,
                datasetTimestamp = dataset_timestamp,
                segmentTags = segment_tags
            )
        }

        return updatedFile.use {
            val params = S3UploadParams(
                bucket = storageBucket,
                orgId = org_id,
                modelId = model_id,
                datasetTimestamp = dataset_timestamp ?: Instant.now().toEpochMilli(),
                uploadType = UploadType.DailyLogEntry, // TODO: support other types
                uploadContent = UploadContent.FileContent(it.toFile()),
                logger = log,
                config = config
            )
            val logUpload: S3UploadResult = params.upload(s3)

            val item = retry(
                ConditionalCheckFailedException::class
            ) {
                val segments = when {
                    segment_tags_json != null -> {
                        Segment.fromTagsJson(segment_tags_json)
                    }

                    segment_tags != null -> {
                        Segment.of(segment_tags)
                    }

                    else -> {
                        null
                    }
                }

                val logEntryItem = LogEntryItem(
                    orgId = org_id,
                    modelId = model_id,
                    path = logUpload.key,
                    segment = segments,
                    datasetTimestamp = dataset_timestamp?.toDate(),
                )
                ddbMapper.save(logEntryItem, DdbExpressions.ShouldNotExistSaveExpr)
                logEntryItem
            }

            LogResponse(
                id = item.key.logEntryId,
                modelId = model_id,
                uploadTimestamp = item.uploadTimestamp.time
            )
        }
    }

    /**
     * Update the original whylogs profile file with appropriate metadata.
     * Throws exception if we fail to process the data
     */
    private suspend fun updateFileMetadata(
        original: File,
        orgId: String,
        datasetId: String,
        datasetTimestamp: Long?,
        segmentTags: List<SegmentTag>?,
    ): DeleteOnCloseTempFile {
        val msg = withContext(Dispatchers.IO) {
            original.inputStream().use { input ->
                @Suppress("BlockingMethodInNonBlockingContext") // false positive. KTIJ-838
                DatasetProfileMessage.parseDelimitedFrom(input)
            }
        }
        val msgBuilder = msg.toBuilder()
        val propertiesBuilder = msgBuilder.propertiesBuilder
        // note: we can't trust user to claim their orgId in the profile
        propertiesBuilder.putTags("orgId", orgId)
        // TODO: verify that datasetId exists in our metadata
        propertiesBuilder.putTags("datasetId", datasetId)
        propertiesBuilder.dataTimestamp = datasetTimestamp ?: Instant.now().toEpochMilli()
        segmentTags?.forEach { tag ->
            propertiesBuilder.putTags(
                "whylogs.tag.${tag.key}",
                tag.value
            )
        }
        return withContext(Dispatchers.IO) {
            val f = DeleteOnCloseTempFile("profile", ".bin")
            @Suppress("BlockingMethodInNonBlockingContext")
            f.toFile().outputStream().use {
                msgBuilder.build().writeDelimitedTo(it)
            }
            f
        }
    }
}

@Schema(description = "Response payload for UploadDatasetProfile.")
data class LogResponse(
    @field:Schema(
        description = "The unique ID that identifies the upload",
        example = DocUtils.ExampleLogId
    )
    val id: String,
    @field:Schema(description = "The model ID for the upload", example = DocUtils.ExampleModelId)
    val modelId: String,
    @field:Schema(
        description = "The time when the upload was completed",
        example = DocUtils.ExampleStartMilli,
        required = true
    )
    val uploadTimestamp: Long,
)

@Schema(description = "Response payload for LogAsync.")
data class AsyncLogResponse(
    @field:Schema(
        description = "The unique ID that identifies the upload",
        example = DocUtils.ExampleLogId
    )
    val id: String,
    @field:Schema(description = "The model ID for the upload", example = DocUtils.ExampleModelId)
    val modelId: String,
    @field:Schema(
        description = "The time when the upload was completed",
        example = DocUtils.ExampleStartMilli
    )
    val uploadTimestamp: Long,
    @field:Schema(description = "The URL to upload the dataset profile to")
    val uploadUrl: String,
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val tags: Segment?
)

@Schema(description = "Request payload for LogAsync.")
data class LogAsyncRequest(
    val datasetTimestamp: Long,
    val segmentTags: List<SegmentTag>,
    val region: String? = null,
)

@Schema(description = "Request payload for LogReference.")
data class LogReferenceRequest(
    val alias: String?,
    val datasetTimestamp: Long?,
    val region: String? = null,
)

data class BatchLogReferenceRequest(
    val references: List<LogReferenceRequest>
)

@Schema(description = "Response payload for uploading reference profile.")
data class LogReferenceResponse(
    @field:Schema(
        description = "The unique ID that identifies the reference",
        example = DocUtils.ExampleLogId
    )
    val id: String,
    @field:Schema(description = "The dataset ID for the upload", example = DocUtils.ExampleModelId)
    val modelId: String,
    @field:Schema(
        description = "A human readable name",
        example = "baseline-reference"
    )
    val alias: String,
    @field:Schema(
        description = "The time when the upload was completed",
        example = DocUtils.ExampleStartMilli
    )
    val uploadTimestamp: Long,
    @field:Schema(description = "The URL to upload the dataset profile to")
    val uploadUrl: String,
)

@Schema(description = "Supported file extensions to logAsync calls.")
enum class WhyLabsFileExtension {
    ZIP,
    BIN,
}

@Schema(description = "Get a url for viewing profiles in the observatory")
data class GetProfileObservatoryLinkRequest(
    val batchProfileTimestamps: List<Long>,
    val referenceProfileIds: List<String>,
)

@Schema(description = "Response for the GetProfileObservatoryLink api")
data class GetProfileObservatoryLinkResponse(
    @field:Schema(description = "The url to use to view each of the profiles. This will show each profile side by side.")
    val observatoryUrl: String,
    @field:Schema(description = "One url for each profile that was sent in. These will show the profiles individually.")
    val individualObservatoryUrls: List<String>
)

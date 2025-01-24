package ai.whylabs.songbird.v0.controllers

import ai.whylabs.dataservice.model.DeleteAnalyzerResult
import ai.whylabs.dataservice.model.DeleteProfile
import ai.whylabs.dataservice.model.GetTracesBySegmentRequest
import ai.whylabs.dataservice.model.GetTracesBySegmentResponse
import ai.whylabs.dataservice.model.GetTracesBySegmentResponseTraceRow
import ai.whylabs.dataservice.model.GetTracesRequest
import ai.whylabs.dataservice.model.GetTracesResponse
import ai.whylabs.dataservice.model.GetTracesResponseTraceRow
import ai.whylabs.dataservice.model.HideSegmentRequest
import ai.whylabs.dataservice.model.SegmentsRequest
import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataset.DatasetProfileManager
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteDataRole
import ai.whylabs.songbird.security.ValidatedIdentity
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.security.getKey
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.OrgUtils
import ai.whylabs.songbird.util.S3ClientProvider
import ai.whylabs.songbird.util.S3DownloadParams
import ai.whylabs.songbird.util.S3UploadParams
import ai.whylabs.songbird.util.UploadType
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.util.toISOString
import ai.whylabs.songbird.v0.dao.DatasetProfileDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.ReferenceProfileItem
import ai.whylabs.songbird.v0.ddb.SegmentedReferenceProfileItem
import ai.whylabs.songbird.v0.ddb.SegmentedReferenceProfileKey
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.models.Segment
import ai.whylabs.songbird.v0.models.SegmentTag
import ai.whylabs.songbird.v0.models.SegmentTagsAnnotation
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3URI
import com.fasterxml.jackson.annotation.JsonInclude
import com.github.michaelbull.retry.policy.limitAttempts
import com.github.michaelbull.retry.retry
import io.micrometer.core.lang.Nullable
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.vavr.control.Try
import jakarta.inject.Inject
import org.joda.time.Duration
import org.joda.time.Interval
import java.net.URI
import java.time.Instant
import java.util.Date

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/dataset-profiles")
@Tag(name = "DatasetProfile", description = "Endpoint for access dataset profiles")
@Secured(AdministratorRole, UserRole)
class DatasetProfileController @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val datasetProfileManager: DatasetProfileManager,
    private val s3ClientProvider: S3ClientProvider,
    private val s3: AmazonS3,
    private val organizationDAO: OrganizationDAO,
    private val dataService: DataService,
    private val datasetProfileDAO: DatasetProfileDAO,
    private val ddbMapper: DynamoDBMapper,
    private val orgUtils: OrgUtils,
) : JsonLogging {
    val ReferenceProfileRegex = Regex("[^A-Za-z0-9-_]")

    /**
     * @param org_id Your company's unique organization ID
     * @param model_id The unique model ID in your company.
     * @param from_epoch Milli epoch time that represents the end of the time range to query based on the upload timestamp.
     * @param to_epoch Milli epoch time that represents the end of the time range to query based on the upload timestamp.
     * @return The metadata for the summarized dataset profile including paths to JSON and protobuf data
     */
    @Operation(
        operationId = "ListReferenceProfiles",
        summary = "Returns a list for reference profiles between the given time range filtered on the upload timestamp",
        description =
        """Returns a list of Reference Profiles between a given time range filtered on the upload timestamp.

        """,
    )
    @Get(
        uri = "/models/{model_id}/reference-profiles",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listReferenceProfiles(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @Schema(example = DocUtils.ExampleStartMilli) from_epoch: Long?,
        @Schema(example = DocUtils.ExampleEndMilli) to_epoch: Long?,
    ): List<ReferenceProfileItemResponse> {
        val refProfiles = datasetProfileDAO.listReferenceProfiles(
            orgId = org_id,
            modelId = model_id,
            fromEpoch = from_epoch ?: 0,
            toEpoch = to_epoch ?: System.currentTimeMillis(),
        ).map { it.toResponse() }

        val segmentedRefProfiles = datasetProfileDAO.listSegmentedReferenceProfiles(
            orgId = org_id,
            modelId = model_id,
            fromEpoch = from_epoch ?: 0,
            toEpoch = to_epoch ?: System.currentTimeMillis(),
        ).map { it.toResponse() }

        return listOf(refProfiles, segmentedRefProfiles).flatten()
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param model_id The unique model ID in your company.
     * @param reference_id Unique reference Id.
     * @return The metadata for the summarized dataset profile including paths to JSON and protobuf data
     */
    @Operation(
        operationId = "GetReferenceProfile",
        summary = "Returns a single reference profile",
        description =
        """Returns a Reference Profile.

        """,
    )
    @Get(
        uri = "/models/{model_id}/reference-profiles/{reference_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getReferenceProfile(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @Schema(example = "ref-xxy") reference_id: String,
    ): ReferenceProfileItemResponse {
        val referenceProfile = datasetProfileDAO.getReferenceProfile(
            orgId = org_id,
            modelId = model_id,
            referenceId = reference_id
        )
        if (referenceProfile != null) {
            return referenceProfile.toDetailedResponse(environmentConfig, s3)
        }

        val segRefProfile = datasetProfileDAO.getSegmentedReferenceProfile(
            orgId = org_id,
            modelId = model_id,
            referenceId = reference_id
        ) ?: throw ResourceNotFoundException("reference profile", reference_id)

        return segRefProfile.toDetailedResponse(environmentConfig, s3)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The unique model ID in your company.
     * @return The metadata for the summarized reference profile data
     */
    @Operation(
        operationId = "CreateReferenceProfile",
        summary = "Returns data needed to uploading the reference profile",
        description =
        """Returns data needed to upload the reference profile. Supports uploading segmented reference profiles. 
            If segments are omitted, provides data needed to upload a single reference profile. 
            This replaces the deprecated LogReference operation.
        """,
    )
    @Post(
        uri = "/models/{dataset_id}/reference-profile",
        produces = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteDataRole)
    suspend fun createReferenceProfile(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) dataset_id: String,
        @Body body: CreateReferenceProfileRequest,
        @Nullable authentication: Authentication,
    ): CreateReferenceProfileResponse {
        if (environmentConfig.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(org_id) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }
        val key: ValidatedIdentity = authentication.getKey()
        val segments = body.segments ?: listOf(Segment())
        val datasetTimestamp = body.datasetTimestamp ?: Instant.now().toEpochMilli()
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val bucketOverride = org.resolveRegionBucket(body.region)
        if (body.region != null && bucketOverride == null) {
            throw IllegalArgumentException("Unsupported region provided: ${body.region}. Remove the requested region to use the default.")
        }
        val destinationOverride = bucketOverride?.uri
            ?: if (!org.storageBucketOverride.isNullOrEmpty()) {
                AmazonS3URI(org.storageBucketOverride)
            } else {
                null
            }

        log.info("Creating reference profile for $org_id / $dataset_id with ${segments.size} segments")
        val uniqueSegmentStrings = segments.map { segment ->
            segment.toString()
        }.toSet()
        if (uniqueSegmentStrings.size != segments.size) {
            throw IllegalArgumentException("Provided segments are not unique")
        }

        val uploadTimestamp = Date()
        val alias = body.alias ?: "ref-${uploadTimestamp.toInstant().toISOString()}"
        // reference id is built from the alias to be human-readable
        val refId = ReferenceProfileRegex.replace(alias, "_")
        var item = SegmentedReferenceProfileItem(
            key = SegmentedReferenceProfileKey(org_id, dataset_id, refId),
            orgId = org_id,
            datasetId = dataset_id,
            alias = alias,
            uploadTimestamp = uploadTimestamp,
            datasetTimestamp = datasetTimestamp.toDate(),
            segments = uniqueSegmentStrings.toList(),
            tags = body.tags,
            version = body.version
        )

        val trySave: Try<Void> = Try.run {
            ddbMapper.save(item, DdbExpressions.ShouldNotExistSaveExpr)
        }
        if (!trySave.isSuccess) {
            try {
                retry(limitAttempts(3)) {
                    // alias/id already used. try again with a random suffix (ex. "#asdfg")
                    val randomSuffix = "-" + (1..5).map { ('a'..'z').random() }.joinToString("")
                    item = item.copy(
                        key = SegmentedReferenceProfileKey(org_id, dataset_id, refId + randomSuffix),
                        alias = alias + randomSuffix,
                    )
                    ddbMapper.save(item, DdbExpressions.ShouldNotExistSaveExpr)
                }
            } catch (e: ConditionalCheckFailedException) {
                throw IllegalArgumentException("Alias for reference profile is taken. Reference profile alias must be unique.")
            }
        }

        val bucket = destinationOverride?.bucket ?: environmentConfig.getEnv(EnvironmentVariable.StorageBucket)
        val results = uniqueSegmentStrings.map { segmentString ->
            val segment = Segment.fromString(segmentString)
            val params = S3UploadParams(
                bucket = bucket,
                orgId = org_id,
                modelId = dataset_id,
                datasetTimestamp = datasetTimestamp,
                tags = segment,
                uploadType = UploadType.ReferenceProfileEntry,
                logger = log,
                config = environmentConfig
            )
            // Always store .json metadata in default region (us-west-2)
            val s3Prefix = params.createUploadMetadata(s3ClientProvider.client(), environmentConfig.getEnv(EnvironmentVariable.StorageBucket), key.identityId, id = item.key.referenceId, alias = item.alias)
            params.createPresignedUpload(
                s3 = s3ClientProvider.client(destinationOverride?.region),
                s3Prefix = s3Prefix,
                overrideUri = org.storageUriOverride,
            )
        }

        // update to include the file paths
        item = item.copy(paths = results.map { result -> result.key })
        ddbMapper.save(item)

        return CreateReferenceProfileResponse(
            id = item.key.referenceId,
            datasetId = dataset_id,
            alias = alias,
            uploadTimestamp = uploadTimestamp.time,
            segments = uniqueSegmentStrings.toList(),
            uploadUrls = results.map { result -> result.url }
        )
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param model_id The unique model ID in your company.
     * @param reference_id Unique reference Id.
     * @return true if successful, false if we encounter failures
     */
    @AuditableResponseBody
    @Operation(
        operationId = "DeleteReferenceProfile",
        summary = "Delete a single reference profile",
        description =
        """Delete a a Reference Profile. Returns false if the deletion encountered some error.

        """,
    )
    @Delete(
        uri = "/models/{model_id}/reference-profiles/{reference_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteReferenceProfile(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @Schema(example = "ref-xxy") reference_id: String,
    ): Boolean {
        // TODO: figure out how to detect reference profiles in use
        return datasetProfileDAO.deleteReferenceProfile(
            orgId = org_id,
            modelId = model_id,
            referenceId = reference_id
        ) or datasetProfileDAO.deleteSegmentedReferenceProfile(
            orgId = org_id,
            modelId = model_id,
            referenceId = reference_id
        )
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The unique dataset ID
     * @param from_epoch Milli epoch time that represents the end of the time range to query.
     * @param to_epoch Milli epoch time that represents the end of the time range to query.
     * @return The metadata for the summarized dataset profile including paths to JSON and protobuf data
     */
    @Operation(
        operationId = "ListProfileTraces",
        summary = "Returns a list for profile traces",
        description =
        """Returns a list of profile traces.

        """,
    )
    @Get(
        uri = "/models/{dataset_id}/trace",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listProfileTraces(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) dataset_id: String,
        @Schema(example = DocUtils.ExampleStartMilli) from_epoch: Long,
        @Schema(example = DocUtils.ExampleEndMilli) to_epoch: Long,
        @QueryValue @SegmentTagsAnnotation segment: List<SegmentTag>?,
        @Schema(example = "50") @QueryValue limit: Int? = 50,
        @Schema(example = "0") @QueryValue offset: Int? = 0,
    ): ProfileTracesResponse {
        val interval = Interval(from_epoch, to_epoch)
        if (interval.toDuration().isLongerThan(Duration.standardDays(70))) { // 10 weeks
            throw IllegalArgumentException("Interval cannot be more than 10 weeks")
        }
        val request = GetTracesBySegmentRequest()
            .orgId(org_id)
            .datasetId(dataset_id)
            .interval(interval.toString())
            .limit(limit)
            .offset(offset)
        if (segment != null) {
            request.segment(
                segment.map { s ->
                    ai.whylabs.dataservice.model.SegmentTag().key(s.key).value(s.value)
                }
            )
        }
        return dataService.profileApi.listTracesBySegment(request).toProfileTracesResponse(s3)
    }

    @Operation(
        operationId = "GetProfileTraces",
        summary = "Returns a list for profile traces matching a trace id",
        description =
        """Returns a list of profile traces matching a trace id

        """,
    )
    @Get(
        uri = "/models/{dataset_id}/trace/{trace_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getProfileTraces(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) dataset_id: String,
        @Schema(example = DocUtils.ExampleTraceId) trace_id: String,
        @Schema(example = "50") @QueryValue limit: Int? = 50,
        @Schema(example = "0") @QueryValue offset: Int? = 0,
    ): ProfileTracesResponse {
        return dataService.profileApi.listTraces(
            GetTracesRequest()
                .orgId(org_id)
                .datasetId(dataset_id)
                .traceId(trace_id)
                .limit(limit)
                .offset(offset)
        ).toProfileTracesResponse(s3, includeDownloadUrl = true)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The unique dataset ID in your company.
     * @param profile_start_timestamp Optional, scope deleting profiles from and more recent than the timestamp
     * @param profile_end_timestamp Optional, scope deleting profiles older than the timestamp
     * @param before_upload_timestamp Optional, scope deleting profiles uploaded on or prior to the timestamp
     * @param delete_analyzer_results Optional, delete analyzer results for the time range between the start and end timestamp.
     * @param column_name Optional, scope deleting profiles for a specific column
     * @return The [DeleteDatasetProfilesResponse] if operation succeeds
     */
    @AuditableResponseBody
    @Operation(
        operationId = "DeleteDatasetProfiles",
        summary = "Deletes a set of dataset profiles",
        description =
        """Deletes a set of dataset profiles. Returns false if scheduling deletion encountered some error.
        Deletion should usually occur within 1 hour of the request. 
        Use the [ListDeleteDatasetProfilesRequests](#DatasetProfile/ListDeleteDatasetProfilesRequests) 
        API to check the status of the deletion request.
        """ + "\n" +
            """Optionally this request also deletes analyzer results between the specified start and end timestamps.    
        The column_name and before_upload_timestamp scopes are NOT applied to analyzer results deletion, so
        make sure you specify a start and end timestamp if setting delete_analyzer_results to true unless
        you want to delete all results.
        """,
    )
    @Delete(
        uri = "/models/{dataset_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun deleteDatasetProfiles(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleStartMilli) profile_start_timestamp: Long?,
        @QueryValue @Schema(example = DocUtils.ExampleEndMilli) profile_end_timestamp: Long?,
        @QueryValue @Schema(example = DocUtils.ExampleStartMilli) before_upload_timestamp: Long?,
        @QueryValue @Schema(example = "true") delete_analyzer_results: Boolean? = true,
        @QueryValue @Schema(required = false) column_name: String? = null,
    ): DeleteDatasetProfilesResponse {
        datasetProfileManager.deleteProfiles(org_id, dataset_id, profile_start_timestamp, profile_end_timestamp, before_upload_timestamp, delete_analyzer_results, column_name)

        return DeleteDatasetProfilesResponse("$org_id/$dataset_id")
    }

    /**
     * @param org_id Your company's unique organization ID
     * @return The list of [DeleteProfile] requests if operation succeeds
     */
    @Operation(
        operationId = "ListDeleteDatasetProfilesRequests",
        summary = "List requests to delete dataset profiles",
        description =
        """List the requests to delete dataset profiles.

        """,
    )
    @Get(
        uri = "/delete-requests/dataset-profiles",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listDeleteDatasetProfileRequests(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
    ): List<DeleteProfile> {
        return dataService.profileApi.getRecentProfileDeletionRequests(org_id)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @return The list of [DeleteAnalyzerResult] requests if operation succeeds
     */
    @WhyLabsInternal
    @Operation(
        operationId = "ListDeleteAnalyzerResultsRequests",
        summary = "List requests to delete analyzer results",
        description =
        """List the requests to delete analyzer results.

        """,
    )
    @Get(
        uri = "/delete-requests/analyzer-results",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listDeleteAnalyzerResultRequests(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
    ): List<DeleteAnalyzerResult> {
        return dataService.analysisApi.getRecentAnalysisDeletionRequests(org_id)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The unique dataset ID in your company.
     * @param profile_start_timestamp Optional, scope deleting profiles from and more recent than the timestamp
     * @param profile_end_timestamp Optional, scope deleting profiles older than the timestamp
     * @return The [DeleteAnalyzerResultsResponse] if operation succeeds
     */
    @AuditableResponseBody
    @Operation(
        operationId = "DeleteAnalyzerResults",
        summary = "Deletes a set of analyzer results",
        description =
        """Deletes a set of analyzer results. Returns false if scheduling deletion encountered some error.

        """,
    )
    @Delete(
        uri = "/models/{dataset_id}/analyzer-results",
        produces = [MediaType.APPLICATION_JSON]
    )

    fun deleteAnalyzerResults(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @QueryValue @Schema(example = DocUtils.ExampleAnalyzerId) analyzer_id: String?,
        @QueryValue @Schema(example = DocUtils.ExampleStartMilli) start_timestamp: Long?,
        @QueryValue @Schema(example = DocUtils.ExampleEndMilli) end_timestamp: Long?,
    ): DeleteAnalyzerResultsResponse {
        datasetProfileManager.deleteAnalyzerResults(org_id, dataset_id, analyzer_id, start_timestamp, end_timestamp)

        return DeleteAnalyzerResultsResponse("$org_id/$dataset_id/$analyzer_id")
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param model_id The unique model ID in your company.
     * @return The list of segments for the dataset profile
     */
    @Operation(
        operationId = "ListSegments",
        summary = "Returns a list of segments",
        description =
        """Returns a list of segments for the dataset.

        """,
    )
    @Get(
        uri = "/models/{model_id}/segments",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun listSegments(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
    ): SegmentListResponse {
        log.info("Getting segments for $org_id/$model_id")
        val segRqst = SegmentsRequest().orgId(org_id).datasetId(model_id)
        val segmentStrings = dataService.profileApi.getSegments(segRqst)
        val segments = segmentStrings.map { Segment.fromText(it) }
        return SegmentListResponse(orgId = org_id, modelId = model_id, segments = segments)
    }

    /**
     * @param org_id Your company's unique organization ID
     * @param dataset_id The unique dataset ID in your company.
     * @return The list of segments hidden for the dataset profile
     */
    @Operation(
        operationId = "HideSegments",
        summary = "Hides a list of segments",
        description =
        """Returns a list of segments that were hidden for a dataset.

        """,
        tags = ["Internal"]
    )
    @WhyLabsInternal
    @AuditableResponseBody
    @Post(
        uri = "/models/{dataset_id}/segments/hide",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun hideSegments(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) dataset_id: String,
        @Body body: SegmentsListRequest,
    ): Response {
        log.info("Hiding segments for $org_id/$dataset_id")
        body.segments.forEach { segment ->
            val request = HideSegmentRequest()
                .orgId(org_id)
                .datasetId(dataset_id)
                .segment(segment)
            dataService.profileApi.hideSegment(request)
        }
        return Response()
    }
}

@JsonInclude(JsonInclude.Include.NON_NULL)
data class SegmentsListRequest(
    val segments: List<String>,
)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ProfileDataDeletionRequest(
    @Schema(description = "Request for profile or analyzer result deletion")
    val orgId: String,
    val datasetId: String,
    val analyzerId: String?,
    val deleteProfiles: Boolean,
    val profileStart: Long?,
    val profileEnd: Long?,
    val beforeUploadTs: Long?,
    val deleteAnalyzerResults: Boolean,
    val analyzerResultsStart: Long?,
    val analyzerResultsEnd: Long?,
    val columnName: String?,
)

data class DeleteDatasetProfilesResponse(
    @Schema(description = "Response for the DeleteDatasetProfiles API", requiredProperties = ["id"])
    val id: String
)

data class DeleteAnalyzerResultsResponse(
    @Schema(description = "Response for the DeleteAnalyzerResults API", requiredProperties = ["id"])
    val id: String
)

@Schema(description = "A single reference item response.")
data class ReferenceProfileItemResponse(
    val orgId: String,
    val modelId: String,
    val alias: String,
    val id: String,
    val uploadTimestamp: Long,
    val datasetTimestamp: Long?,
    val downloadUrl: String? = null,
    val segments: List<String>? = null,
    val downloadUrls: List<String>? = null,
)

@Schema(description = "Request payload for CreateReferenceProfile.")
data class CreateReferenceProfileRequest(
    val alias: String?,
    val version: String?,
    val datasetTimestamp: Long?,
    val segments: List<Segment>? = null,
    val tags: List<String>? = listOf(),
    val region: String? = null,
)

@Schema(description = "Response payload for creating a reference profile.")
data class CreateReferenceProfileResponse(
    @field:Schema(
        description = "The unique ID that identifies the reference profile",
        example = DocUtils.ExampleLogId
    )
    val id: String,
    @field:Schema(
        description = "A human readable name",
        example = "baseline-reference"
    )
    val alias: String,
    @field:Schema(description = "The dataset ID for the upload", example = DocUtils.ExampleModelId)
    val datasetId: String,
    @field:Schema(
        description = "The time when the upload was completed",
        example = DocUtils.ExampleStartMilli
    )
    val uploadTimestamp: Long,
    @field:Schema(description = "The segments corresponding to the upload URLs")
    val segments: List<String>,
    @field:Schema(description = "The URL list to upload the dataset profiles to")
    val uploadUrls: List<String>,
)

fun ReferenceProfileItem.toResponse(): ReferenceProfileItemResponse {
    return ReferenceProfileItemResponse(
        alias = this.alias,
        orgId = this.orgId,
        modelId = this.modelId,
        id = this.key.referenceId,
        uploadTimestamp = this.uploadTimestamp.time,
        datasetTimestamp = this.datasetTimestamp?.time
    )
}

fun SegmentedReferenceProfileItem.toResponse(): ReferenceProfileItemResponse {
    return ReferenceProfileItemResponse(
        alias = this.alias,
        orgId = this.orgId,
        modelId = this.datasetId,
        id = this.key.referenceId,
        uploadTimestamp = this.uploadTimestamp.time,
        datasetTimestamp = this.datasetTimestamp?.time,
        segments = this.segments,
    )
}

fun ReferenceProfileItem.toDetailedResponse(environmentConfig: EnvironmentConfig, s3: AmazonS3): ReferenceProfileItemResponse {
    val downloadParams = S3DownloadParams(
        bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket),
        key = this.path,
        downloadType = DownloadType.ReferenceProfileEntry,
    )
    val presignedUrl = downloadParams.createPresignedDownload(s3)
    return ReferenceProfileItemResponse(
        alias = this.alias,
        orgId = this.orgId,
        modelId = this.modelId,
        id = this.key.referenceId,
        uploadTimestamp = this.uploadTimestamp.time,
        datasetTimestamp = this.datasetTimestamp?.time,
        downloadUrl = presignedUrl.url,
    )
}

fun SegmentedReferenceProfileItem.toDetailedResponse(environmentConfig: EnvironmentConfig, s3: AmazonS3): ReferenceProfileItemResponse {
    return ReferenceProfileItemResponse(
        alias = this.alias,
        orgId = this.orgId,
        modelId = this.datasetId,
        id = this.key.referenceId,
        uploadTimestamp = this.uploadTimestamp.time,
        datasetTimestamp = this.datasetTimestamp?.time,
        segments = this.segments,
        downloadUrls = List(this.segments.size) { i ->
            val downloadParams = S3DownloadParams(
                bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket),
                key = this.paths[i],
                downloadType = DownloadType.ReferenceProfileEntry,
            )
            downloadParams.createPresignedDownload(s3).url
        }
    )
}

fun GetTracesResponse.toProfileTracesResponse(s3: AmazonS3, includeDownloadUrl: Boolean = false): ProfileTracesResponse {
    return ProfileTracesResponse(
        traces = this.traces.map { it.toProfileTrace(s3, includeDownloadUrl) },
        nextOffset = this.nextOffset,
        isTruncated = this.isTruncated,
    )
}

fun GetTracesBySegmentResponse.toProfileTracesResponse(s3: AmazonS3): ProfileTracesResponse {
    return ProfileTracesResponse(
        traces = this.traces.map { it.toProfileTrace(s3) },
        nextOffset = this.nextOffset,
        isTruncated = this.isTruncated,
    )
}

fun GetTracesBySegmentResponseTraceRow.toProfileTrace(s3: AmazonS3): ProfileTrace {
    return ProfileTrace(
        traceId = this.traceId,
        datasetTimestamp = this.datasetTimestamp,
    )
}

fun GetTracesResponseTraceRow.toProfileTrace(s3: AmazonS3, includeDownloadUrl: Boolean = false): ProfileTrace {
    val downloadUrl = if (includeDownloadUrl) {
        val uri = URI(this.file)
        val bucket = uri.host
        val path = uri.path.substring(1) // remove leading "/"
        val downloadParams = S3DownloadParams(
            bucket = bucket,
            key = path,
            downloadType = DownloadType.PresignedDailyLogEntry,
        )
        downloadParams.createPresignedDownload(s3).url
    } else {
        null
    }
    return ProfileTrace(
        traceId = this.traceId,
        datasetTimestamp = this.datasetTimestamp,
        downloadUrl = downloadUrl,
    )
}

@Schema(description = "Response for listing profile traces")
data class ProfileTracesResponse(
    val traces: List<ProfileTrace>,
    val nextOffset: Int? = null,
    val isTruncated: Boolean? = null,
)

@Schema(description = "A single profile trace item")
data class ProfileTrace(
    val traceId: String,
    val datasetTimestamp: Long? = null,
    val downloadUrl: String? = null,
)

@Schema(description = "A segment list response.")
data class SegmentListResponse(
    val orgId: String,
    val modelId: String,
    val segments: List<Segment>,
)

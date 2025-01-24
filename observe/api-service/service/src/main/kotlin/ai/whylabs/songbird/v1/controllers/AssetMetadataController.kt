package ai.whylabs.songbird.v1.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.Stage
import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.operations.getRequestUserId
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.S3UploadParams
import ai.whylabs.songbird.util.UploadType
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.v0.dao.AssetMetadata
import ai.whylabs.songbird.v0.dao.AssetMetadataDAO
import ai.whylabs.songbird.v0.dao.AssetTagEntry
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.AssetMetadataItem
import ai.whylabs.songbird.v0.ddb.AssetMetadataKey
import com.amazonaws.HttpMethod
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3URI
import com.amazonaws.services.s3.model.GeneratePresignedUrlRequest
import com.amazonaws.services.s3.model.PutObjectRequest
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.QueryValue
import io.micronaut.http.annotation.RequestAttribute
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject
import java.time.Duration
import java.time.Instant

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v1/assets")
@Tags(
    Tag(name = "Assets", description = "Endpoint for configured assets."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class AssetsController @Inject constructor(
    private val env: EnvironmentConfig,
    private val assetMetadataDAO: AssetMetadataDAO,
    private val organizationDAO: OrganizationDAO,
    private val s3: AmazonS3,
) : JsonLogging {
    private val assetBucket = if (env.getStage() == Stage.Production) {
        "whylabs-assets"
    } else {
        env.getEnv(EnvironmentVariable.StorageBucket)
    }
    private val allowedAssetBuckets = setOf("whylabs-assets", "whylabs-static", assetBucket)
    private val sharedAssetsOrgId = "shared-assets"

    @WhyLabsInternal
    @Operation(
        operationId = "UploadSharedAsset",
        summary = "Endpoint to upload a shared asset",
        description = "Endpoint to upload a shared asset",
        tags = ["Internal"],
    )
    @Post(
        uri = "/{asset_id}/upload-shared",
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun uploadSharedAsset(
        @Schema(example = DocUtils.ExampleAssetId) asset_id: String,
        @QueryValue tag: String,
        @QueryValue filename: String? = null,
        @Body request: UploadAssetRequest,
    ): UploadAssetResponse {
        val resolvedFileName = filename ?: asset_id
        if (tag.trim().isEmpty()) {
            throw IllegalArgumentException("Tag cannot be empty")
        }
        val s3Params = S3UploadParams(
            bucket = assetBucket,
            orgId = sharedAssetsOrgId,
            modelId = "", // unused
            datasetTimestamp = null,
            uploadType = UploadType.Asset,
            logger = log,
            config = env
        )
        val assetKey = getAssetKey(sharedAssetsOrgId, asset_id, resolvedFileName, shared = true)
        val uploadUrl = s3Params.createPresignedUpload(
            s3 = s3,
            s3Prefix = resolvedFileName,
            overrideFileKey = assetKey,
            expirationInMinutes = 60,
        )
        val s3Uri = AmazonS3URI("s3://$assetBucket/$assetKey")
        val newItem = addAsset(sharedAssetsOrgId, asset_id, s3Uri.toString(), tag, uploaded = false, shared = true)
        return UploadAssetResponse(uploadUrl = uploadUrl.url, tag = newItem.tag, version = newItem.version.toInt())
    }

    @Operation(
        operationId = "UploadAsset",
        summary = "Endpoint to upload an asset",
        description = "Endpoint to upload an asset",
    )
    @Post(
        uri = "/{asset_id}/upload",
        consumes = [MediaType.APPLICATION_JSON],
    )
    fun uploadAsset(
        @Schema(example = DocUtils.ExampleAssetId) asset_id: String,
        @QueryValue tag: String,
        @QueryValue filename: String? = null,
        @Body request: UploadAssetRequest,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
    ): UploadAssetResponse {
        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)
        val resolvedFileName = filename ?: asset_id
        if (tag.trim().isEmpty()) {
            throw IllegalArgumentException("Tag cannot be empty")
        }
        val s3Params = S3UploadParams(
            bucket = assetBucket,
            orgId = orgId,
            modelId = "", // unused
            datasetTimestamp = null,
            uploadType = UploadType.Asset,
            logger = log,
            config = env
        )
        val assetKey = getAssetKey(orgId, asset_id, resolvedFileName)
        val uploadUrl = s3Params.createPresignedUpload(
            s3 = s3,
            s3Prefix = resolvedFileName,
            overrideFileKey = assetKey,
            overrideUri = org.storageUriOverride,
            expirationInMinutes = 60,
        )
        val s3Uri = AmazonS3URI("s3://$assetBucket/$assetKey")
        val newItem = addAsset(orgId, asset_id, s3Uri.toString(), tag, uploaded = false, shared = false)
        return UploadAssetResponse(uploadUrl = uploadUrl.url, tag = newItem.tag, version = newItem.version.toInt())
    }

    @Operation(
        operationId = "UploadAssetOctetStream",
        summary = "Endpoint to upload an asset as octet-stream",
        description = "Endpoint to upload an asset as octet-stream",
    )
    @Post(
        uri = "/{asset_id}/upload",
        consumes = [MediaType.APPLICATION_OCTET_STREAM],
    )
    fun uploadAssetOctetStream(
        @Schema(example = DocUtils.ExampleAssetId) asset_id: String,
        @QueryValue tag: String,
        @QueryValue filename: String? = null,
        @Body request: ByteArray,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
    ): UploadAssetResponse {
        val resolvedFileName = filename ?: asset_id
        if (tag.trim().isEmpty()) {
            throw IllegalArgumentException("Tag cannot be empty")
        }
        val assetKey = getAssetKey(orgId, asset_id, resolvedFileName)
        val putObjRequest = PutObjectRequest(assetBucket, assetKey, request.inputStream(), null)
        s3.putObject(putObjRequest)
        val s3Uri = AmazonS3URI("s3://$assetBucket/$assetKey")
        val newItem = addAsset(orgId, asset_id, s3Uri.toString(), tag, uploaded = true, shared = false)
        return UploadAssetResponse(tag = newItem.tag, version = newItem.version.toInt())
    }

    @Operation(
        operationId = "GetAsset",
        summary = "Endpoint to retrieve assets",
        description = "Endpoint to retrieve assets",
    )
    @Get(
        uri = "/{asset_id}/",
        produces = [MediaType.APPLICATION_JSON],
    )
    @Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole, SecurityValues.SecureContainerRole)
    fun getAsset(
        @Schema(example = DocUtils.ExampleAssetId) asset_id: String,
        @QueryValue tag: String,
        @QueryValue version: Int? = null,
        @Schema(required = false)
        @QueryValue shared: Boolean? = false,
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
    ): GetAssetResponse {
        if (shared == true) {
            updateUploadStatus(sharedAssetsOrgId, asset_id)
        }
        return fetchAsset(orgId, asset_id, tag, version, shared) ?: throw ResourceNotFoundException("Asset not found")
    }

    @Operation(
        operationId = "ListOrganizationAssets",
        summary = "Endpoint to list assets for an organization",
        description = "Endpoint to list assets for an organization",
    )
    @Get(
        uri = "/list",
        produces = [MediaType.APPLICATION_JSON],
    )
    @Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole, SecurityValues.SecureContainerRole)
    fun listOrgAssets(
        @Schema(description = "WhyLabs OrgId", hidden = true, required = false)
        @RequestAttribute(WhyLabsAttributes.RequestOrganizationId) orgId: String,
        @QueryValue limit: Int? = null,
        @QueryValue shared: Boolean? = false,
    ): ListAssetsResponse {
        val resolvedOrgId = if (shared == true) {
            sharedAssetsOrgId
        } else orgId
        val assetsList = assetMetadataDAO.listOrgAssets(resolvedOrgId).take(limit ?: 100).toList()

        return ListAssetsResponse(assetsList)
    }

    private fun fetchAsset(orgId: String, assetId: String, tag: String, version: Int?, shared: Boolean?): GetAssetResponse? {
        val queryFilter = mutableMapOf<String, Condition>()
        queryFilter["tag"] = Condition()
            .withComparisonOperator(ComparisonOperator.EQ)
            .withAttributeValueList(AttributeValue().withS(tag))
        queryFilter["uploaded"] to Condition()
            .withComparisonOperator(ComparisonOperator.NE)
            .withAttributeValueList(AttributeValue().withBOOL(false))

        val orgIsPaid = organizationDAO.getOrganization(orgId, refreshCacheEntry = true).isPaidTier()
        if (shared == true && !orgIsPaid) {
            throw IllegalArgumentException("Shared assets are not enabled for your organization. Contact us to enable this feature.")
        }

        return if (orgIsPaid && shared == true) {
            assetMetadataDAO.query(
                AssetMetadataItem(orgId = sharedAssetsOrgId, assetId = assetId),
                version = version,
                queryFilter = queryFilter,
            ).maxByOrNull { it.assetVersion }?.toAssetResponse(shared = true)
        } else {
            assetMetadataDAO.query(
                AssetMetadataItem(orgId = orgId, assetId = assetId),
                version = version,
                queryFilter = queryFilter,
            ).maxByOrNull { it.assetVersion }?.toAssetResponse(shared = false)
        }
    }

    private fun AssetMetadata.toAssetResponse(shared: Boolean): GetAssetResponse {
        val s3Uri = AmazonS3URI(s3Uri)
        if (s3Uri.bucket !in allowedAssetBuckets) {
            throw IllegalArgumentException("Invalid bucket: ${s3Uri.bucket}")
        }
        val downloadUrl = s3.generatePresignedUrl(
            GeneratePresignedUrlRequest(s3Uri.bucket, s3Uri.key)
                .withMethod(HttpMethod.GET)
                .withExpiration(Instant.now().plus(Duration.ofMinutes(15)).toDate())
        ).toString()
        return GetAssetResponse(
            downloadUrl = downloadUrl,
            shared = shared,
            version = version.toInt(),
            tag = tag,
        )
    }

    private fun updateUploadStatus(orgId: String, assetId: String): Boolean {
        var isAnyUploaded = false

        assetMetadataDAO.query(
            AssetMetadataItem(orgId = orgId, assetId = assetId)
        ).forEach { asset ->
            if (asset.uploaded == false) {
                val assetUri = AmazonS3URI(asset.s3Uri)
                val uploaded = s3.doesObjectExist(assetUri.bucket, assetUri.key)
                if (uploaded) {
                    assetMetadataDAO.toItem(asset.copy(uploaded = true)).apply {
                        assetMetadataDAO.update(this)
                    }
                    isAnyUploaded = true
                } else {
                    // clean up the asset if it's not uploaded
                    assetMetadataDAO.toItem(asset).apply {
                        assetMetadataDAO.delete(this)
                    }
                }
            } else {
                isAnyUploaded = true
            }
        }
        return isAnyUploaded
    }

    private fun addAsset(orgId: String, assetId: String, fileUri: String, tag: String, uploaded: Boolean, shared: Boolean?): AssetMetadata {
        val resolvedOrgId = if (shared == true) {
            sharedAssetsOrgId
        } else orgId
        val version = assetMetadataDAO.incrementAndGetId(resolvedOrgId, assetId, tag).toString()
        val s3Uri = AmazonS3URI(fileUri)
        if (s3Uri.bucket !in allowedAssetBuckets) {
            throw IllegalArgumentException("Invalid bucket: ${s3Uri.bucket}")
        }

        val item = AssetMetadataItem(
            key = AssetMetadataKey(resolvedOrgId, assetId, tag, version),
            orgId = resolvedOrgId,
            assetId = assetId,
            s3Uri = s3Uri.toString(),
            assetVersion = version.toInt(),
            version = version,
            author = getRequestUserId(),
            tag = tag,
            uploaded = uploaded,
        )
        return assetMetadataDAO.create(item)
    }

    private fun getAssetKey(orgId: String, asset_id: String, resolvedFileName: String, shared: Boolean? = false): String {
        return if (shared == true) {
            "assets/$sharedAssetsOrgId/$asset_id/${System.currentTimeMillis()}/$resolvedFileName"
        } else {
            "assets/$orgId/$asset_id/${System.currentTimeMillis()}/$resolvedFileName"
        }
    }
}

data class GetAssetResponse(
    val downloadUrl: String,
    val shared: Boolean,
    val version: Int? = null,
    val tag: String? = null,
)

data class UploadAssetRequest(
    val debug: Boolean? = null,
)

data class UploadAssetResponse(
    val uploadUrl: String? = null,
    val version: Int? = null,
    val tag: String? = null,
)

data class ListAssetsResponse(
    val assets: List<AssetTagEntry>,
)

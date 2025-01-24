package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.util.MetadataUtils
import ai.whylabs.songbird.util.RegionBucket
import ai.whylabs.songbird.util.randomAlphaNumericId
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.DdbUtils.query
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.datamodeling.IDynamoDBMapper
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import io.swagger.v3.oas.annotations.Hidden
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.retryWhen
import kotlinx.coroutines.flow.single
import java.util.concurrent.TimeUnit

interface OrganizationDAO {
    fun listOrganizations(): List<OrganizationSummary>
    fun listManagedOrganizations(orgId: String): List<OrganizationSummary>
    fun getOrganization(orgId: String, refreshCacheEntry: Boolean = false): OrganizationMetadata
    fun getOrganizationOrNull(orgId: String, refreshCacheEntry: Boolean = false): OrganizationMetadata?
    suspend fun updateOrganization(
        orgId: String,
        name: String,
        subscriptionTier: SubscriptionTier?,
        emailDomains: String? = null,
        observatoryUrl: String? = null,
        deleted: Boolean? = false,
        useCloudFront: Boolean? = null,
        parentOrgId: String? = null,
        storageBucketOverride: String? = null,
        storageUriOverride: String? = null,
        allowManagedMembershipUpdatesOnly: Boolean? = null,
    ): String

    suspend fun updateOrganization(
        organizationMetadata: OrganizationMetadata
    ): String

    suspend fun createOrganization(
        name: String,
        subscriptionTier: SubscriptionTier?,
        emailDomains: String? = null,
        observatoryUrl: String? = null,
        overrideId: String? = null,
        useCloudFront: Boolean? = null,
        parentOrgId: String? = null,
        storageBucketOverride: String? = null,
        storageUriOverride: String? = null,
        allowManagedMembershipUpdatesOnly: Boolean? = null,
    ): String

    fun checkExistence(orgId: String)

    fun externalUpdate(orgId: String)
}

@Singleton
class OrganizationItemCacheLoader(@Inject private val ddbMapper: IDynamoDBMapper) :
    CacheLoader<String, OrganizationItem>(), JsonLogging {

    // expensive cache
    val items: LoadingCache<String, OrganizationItem> = CacheBuilder.newBuilder()
        .maximumSize(1000)
        // for refresh the cache every 5 minutes
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build(this)

    // We always use consistent reads from ddb for this class because it has an in memory cache.
    // Doing otherwise would get very complicated and the benefits would be limited because we don't
    // hit these in ddb as often (because they're locally cached).
    private val consistentRead = DynamoDBMapperConfig.builder()
        .withConsistentReads(DynamoDBMapperConfig.ConsistentReads.CONSISTENT)
        .build()

    override fun load(orgId: String): OrganizationItem {
        log.debug("Load data for: $orgId")
        return ddbMapper.load(OrganizationItem(orgId), consistentRead)
    }

    fun exists(orgId: String): Boolean {
        try {
            this.items.get(orgId)
        } catch (e: Exception) {
            return false
        }
        return true
    }
}

@Singleton
class OrganizationDAOImpl @Inject constructor(
    private val ddbMapper: DynamoDBMapper,
    private val cache: OrganizationItemCacheLoader,
) : OrganizationDAO, JsonLogging {

    override fun checkExistence(orgId: String) {
        if (!cache.exists(orgId)) {
            throw ResourceNotFoundException("Organization", orgId)
        }
    }

    override fun externalUpdate(orgId: String) {
        this.cache.items.invalidate(orgId)
    }

    private fun OrganizationItem.toOrganizationSummary(): OrganizationSummary {
        val (_, reconciledDomains) = MetadataUtils.reconcileDomains(domain, emailDomains)
        return OrganizationSummary(
            key.orgId,
            name,
            subscriptionTier,
            reconciledDomains,
            observatoryUrl,
            parentOrgId,
            allowManagedMembershipUpdatesOnly,
        )
    }
    override fun listOrganizations(): List<OrganizationSummary> {
        val query = DynamoDBQueryExpression<OrganizationItem>()
            .withIndexName(OrganizationItem.Index)
            .withHashKeyValues(OrganizationItem())
            .withFilterExpression("attribute_not_exists(is_deleted) or is_deleted = :not_deleted")
            .withExpressionAttributeValues(
                mapOf<String?, AttributeValue?>(":not_deleted" to AttributeValue().withN("0"))
            )

        return ddbMapper.query(query)
            .iterator()
            .asSequence()
            .map { it.toOrganizationSummary() }
            .toList()
    }

    override fun listManagedOrganizations(orgId: String): List<OrganizationSummary> {
        val query = DynamoDBQueryExpression<OrganizationItem>()
            .withIndexName(OrganizationItem.ManagedOrgIndex)
            .withHashKeyValues(OrganizationItem(parentOrgId = orgId))
            .withFilterExpression("attribute_not_exists(is_deleted) or is_deleted = :not_deleted")
            .withExpressionAttributeValues(
                mapOf<String?, AttributeValue?>(
                    ":not_deleted" to AttributeValue().withN("0")
                )
            )

        return ddbMapper.query(query)
            .iterator()
            .asSequence()
            .map { it.toOrganizationSummary() }
            .toList()
    }

    override fun getOrganization(orgId: String, refreshCacheEntry: Boolean): OrganizationMetadata {
        log.debug("Get organization: $orgId")
        if (refreshCacheEntry) {
            cache.items.invalidate(orgId)
        }

        // This method has the side effect of actually loading the item into the cache if its missing as well
        this.checkExistence(orgId)

        val item = cache.items.get(orgId)

        if (item.deleted == true) {
            throw ResourceNotFoundException("Organization", orgId)
        }

        val (_, reconciledDomains) = MetadataUtils.reconcileDomains(item.domain, item.emailDomains)

        return OrganizationMetadata(
            item.key.orgId,
            item.name,
            item.subscriptionTier,
            reconciledDomains,
            item.observatoryUrl,
            item.creation_time.time,
            item.deleted ?: false,
            item.useCloudFront,
            item.parentOrgId,
            storageBucketOverride = item.storageBucketOverride,
            storageUriOverride = item.storageUriOverride,
            allowManagedMembershipUpdatesOnly = item.allowManagedMembershipUpdatesOnly,
        )
    }

    override fun getOrganizationOrNull(orgId: String, refreshCacheEntry: Boolean): OrganizationMetadata? {
        return try {
            getOrganization(orgId, refreshCacheEntry)
        } catch (e: ResourceNotFoundException) {
            null
        }
    }

    override suspend fun updateOrganization(
        orgId: String,
        name: String,
        subscriptionTier: SubscriptionTier?,
        emailDomains: String?,
        observatoryUrl: String?,
        deleted: Boolean?,
        useCloudFront: Boolean?,
        parentOrgId: String?,
        storageBucketOverride: String?,
        storageUriOverride: String?,
        allowManagedMembershipUpdatesOnly: Boolean?,
    ): String {
        trySaveOrganization(
            orgId,
            name,
            subscriptionTier,
            emailDomains,
            observatoryUrl,
            expectExisting = true,
            deleted = deleted,
            useCloudFront = useCloudFront,
            parentOrgId = parentOrgId,
            storageBucketOverride = storageBucketOverride,
            storageUriOverride = storageUriOverride,
            allowManagedMembershipUpdatesOnly = allowManagedMembershipUpdatesOnly,
        )
        return orgId
    }

    override suspend fun updateOrganization(
        organizationMetadata: OrganizationMetadata
    ): String {
        trySaveOrganization(
            orgId = organizationMetadata.id,
            name = organizationMetadata.name,
            subscriptionTier = organizationMetadata.subscriptionTier,
            emailDomains = organizationMetadata.emailDomains,
            observatoryUrl = organizationMetadata.observatoryUrl,
            expectExisting = true,
            deleted = organizationMetadata.deleted,
            useCloudFront = organizationMetadata.useCloudFront,
            parentOrgId = organizationMetadata.parentOrgId,
            storageBucketOverride = organizationMetadata.storageBucketOverride,
            storageUriOverride = organizationMetadata.storageUriOverride,
            allowManagedMembershipUpdatesOnly = organizationMetadata.allowManagedMembershipUpdatesOnly,
        )
        return organizationMetadata.id
    }

    override suspend fun createOrganization(
        name: String,
        subscriptionTier: SubscriptionTier?,
        emailDomains: String?,
        observatoryUrl: String?,
        overrideId: String?,
        useCloudFront: Boolean?,
        parentOrgId: String?,
        storageBucketOverride: String?,
        storageUriOverride: String?,
        allowManagedMembershipUpdatesOnly: Boolean?,
    ): String {
        if (overrideId != null) {
            if (OrganizationItem.IdFormat.matchEntire(overrideId) == null) {
                throw IllegalArgumentException("Invalid ID format: $overrideId")
            }
            trySaveOrganization(
                overrideId,
                name,
                subscriptionTier,
                emailDomains,
                observatoryUrl,
                expectExisting = false,
                deleted = false,
                // always use Cloudfront for new organizations
                useCloudFront = useCloudFront,
                parentOrgId,
                storageBucketOverride = storageBucketOverride,
                storageUriOverride = storageUriOverride,
                allowManagedMembershipUpdatesOnly = allowManagedMembershipUpdatesOnly,
            )
            return overrideId
        }

        return flow {
            val randomId = randomAlphaNumericId()
            val orgId = "org-$randomId"
            trySaveOrganization(
                orgId,
                name,
                subscriptionTier,
                emailDomains,
                observatoryUrl,
                expectExisting = false,
                deleted = false,
                // always use Cloudfront for new organizations
                useCloudFront = true,
                parentOrgId,
                allowManagedMembershipUpdatesOnly = allowManagedMembershipUpdatesOnly
            )
            emit(orgId)
        }.retryWhen { cause, attempt -> cause is ConditionalCheckFailedException && attempt < 5 }
            .single()
    }

    private fun trySaveOrganization(
        orgId: String,
        name: String,
        subscriptionTier: SubscriptionTier?,
        emailDomains: String?,
        observatoryUrl: String?,
        expectExisting: Boolean,
        deleted: Boolean?,
        useCloudFront: Boolean?,
        parentOrgId: String?,
        storageBucketOverride: String? = null,
        storageUriOverride: String? = null,
        allowManagedMembershipUpdatesOnly: Boolean?,
    ) {
        // TODO: add validation criteria for parentOrgId (domain, single-level hierarchy)

        val item =
            OrganizationItem(
                orgId = orgId,
                name = name,
                subscriptionTier = subscriptionTier,
                emailDomains = emailDomains,
                observatoryUrl = observatoryUrl,
                deleted = deleted,
                useCloudFront = useCloudFront,
                parentOrgId = parentOrgId,
                storageBucketOverride = storageBucketOverride,
                storageUriOverride = storageUriOverride,
                allowManagedMembershipUpdatesOnly = allowManagedMembershipUpdatesOnly,
            )
        val ddbExpr =
            if (expectExisting) DdbExpressions.shouldExistSaveExpr(item.key.toAttr()) else DdbExpressions.ShouldNotExistSaveExpr

        ddbMapper.save(item, ddbExpr)
    }
}

@Schema(description = "Metadata about an organization", requiredProperties = ["id"])
data class OrganizationMetadata(
    val id: String,
    val name: String,
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val subscriptionTier: SubscriptionTier?,
    val emailDomains: String?,
    val observatoryUrl: String?,
    val creationTime: Long,
    val deleted: Boolean,
    val useCloudFront: Boolean?,
    val parentOrgId: String?,
    val subscriptionId: String? = null,
    val storageBucketOverride: String? = null,
    val storageUriOverride: String? = null,
    val allowManagedMembershipUpdatesOnly: Boolean? = null,
) {

    @Hidden
    fun shouldUseCloudFront(): Boolean {
        if (hasStorageBucketOverride()) {
            return false
        }

        return if (subscriptionTier == SubscriptionTier.FREE) {
            true
        } else {
            useCloudFront == true
        }
    }

    @Hidden
    fun resolveRegionBucket(region: String?): RegionBucket? {
        val resolvedRegion = if (storageUriOverride.isNullOrBlank()) {
            region
        } else {
            null // Ignore region if storageUriOverride is set. URI override always uses the default region
        }
        return RegionBucket.fromRegion(resolvedRegion)
    }

    @Hidden
    fun hasStorageBucketOverride(): Boolean {
        return !storageBucketOverride.isNullOrBlank()
    }

    @Hidden
    fun isPaidTier(): Boolean {
        return subscriptionTier in listOf(SubscriptionTier.AWS_MARKETPLACE, SubscriptionTier.PAID, SubscriptionTier.SUBSCRIPTION)
    }
}

@Schema(description = "Summary about an organization", requiredProperties = ["id"])
data class OrganizationSummary(
    val id: String,
    val name: String,
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val subscriptionTier: SubscriptionTier?,
    val emailDomains: String?,
    val observatoryUrl: String?,
    val parentOrgId: String?,
    val allowManagedMembershipUpdatesOnly: Boolean? = null,
)

package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date

/**
 * @see [DynamoCRUD]
 */
@Singleton
class OrganizationDAO2 @Inject constructor(
    private val mapper: DynamoDBMapper,
    private val organizationDAO: OrganizationDAO
) :
    DynamoCRUD<OrganizationItem, OrganizationMetadata, ItemId.String>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = OrganizationItem::class.java
    override fun getListIndex(): String = OrganizationItem.Index
    override fun createId(item: OrganizationItem) = throw RuntimeException("Supply an orgId explicitly in the OrganizationItem to create an org.")

    override fun delete(t: OrganizationItem) {
        super.delete(t)
        organizationDAO.externalUpdate(t.orgId)
    }

    override fun update(item: OrganizationItem) {
        super.update(item)
        organizationDAO.externalUpdate(item.orgId)
    }

    override fun updatePartial(item: OrganizationItem) {
        super.updatePartial(item)
        organizationDAO.externalUpdate(item.orgId)
    }

    override fun load(item: OrganizationItem, consistentReads: Boolean): OrganizationMetadata? {
        val org = super.load(item, consistentReads)

        if (org?.deleted == true) {
            throw ResourceNotFoundException("org", org.id)
        }

        return org
    }

    override fun toItem(apiModel: OrganizationMetadata): OrganizationItem {
        return OrganizationItem(
            orgId = apiModel.id,
            name = apiModel.name,
            subscriptionTier = apiModel.subscriptionTier,
            emailDomains = apiModel.emailDomains,
            observatoryUrl = apiModel.observatoryUrl,
            creation_time = Date(apiModel.creationTime),
            deleted = apiModel.deleted,
            parentOrgId = apiModel.parentOrgId,
            allowManagedMembershipUpdatesOnly = apiModel.allowManagedMembershipUpdatesOnly,
        )
    }

    override fun toApiModel(item: OrganizationItem): OrganizationMetadata {
        return OrganizationMetadata(
            id = item.orgId,
            name = item.name,
            subscriptionTier = item.subscriptionTier,
            emailDomains = item.emailDomains,
            observatoryUrl = item.observatoryUrl,
            creationTime = item.creation_time.time,
            deleted = item.deleted ?: false,
            useCloudFront = item.useCloudFront,
            parentOrgId = item.parentOrgId,
            allowManagedMembershipUpdatesOnly = item.allowManagedMembershipUpdatesOnly,
        )
    }
}

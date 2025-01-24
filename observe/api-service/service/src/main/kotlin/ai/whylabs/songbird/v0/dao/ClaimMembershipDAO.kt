package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.ClaimMembershipItem
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.Role
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton

data class ClaimMembershipMetadata(
    val orgId: String,
    val role: Role,
    val userId: String,
    val default: Boolean,
)

@Singleton
class ClaimMembershipDAO @Inject constructor(private val mapper: DynamoDBMapper) : DynamoCRUD<ClaimMembershipItem, ClaimMembershipMetadata, ItemId.None>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = ClaimMembershipItem::class.java

    override fun toItem(apiModel: ClaimMembershipMetadata): ClaimMembershipItem {
        return ClaimMembershipItem(
            orgId = apiModel.orgId,
            userId = apiModel.userId,
            role = apiModel.role,
            default = apiModel.default
        )
    }

    override fun toApiModel(item: ClaimMembershipItem): ClaimMembershipMetadata {
        return ClaimMembershipMetadata(
            orgId = item.orgId,
            userId = item.userId,
            role = item.role,
            default = item.default
        )
    }

    override fun getListIndex() = "claim-member-index"

    override fun createId(item: ClaimMembershipItem) = ItemId.None
}

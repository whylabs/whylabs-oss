package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.MembershipItem
import ai.whylabs.songbird.v0.ddb.Role
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton

data class MembershipMetadata(
    val orgId: String,
    val role: Role,
    val userId: String,
    val default: Boolean,
)
@Singleton
class MembershipDAO @Inject constructor(private val mapper: DynamoDBMapper) : DynamoCRUD<MembershipItem, MembershipMetadata, ItemId.None>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = MembershipItem::class.java

    override fun toItem(apiModel: MembershipMetadata): MembershipItem {
        return MembershipItem(
            orgId = apiModel.orgId,
            userId = apiModel.userId,
            role = apiModel.role,
            default = apiModel.default
        )
    }

    override fun toApiModel(item: MembershipItem): MembershipMetadata {
        return MembershipMetadata(
            orgId = item.orgId,
            userId = item.userId,
            role = item.role,
            default = item.default
        )
    }

    override fun getListIndex() = "member-index"

    override fun createId(item: MembershipItem) = ItemId.None
}

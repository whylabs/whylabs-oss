package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.SubscriptionMetadataItem
import ai.whylabs.songbird.v0.ddb.SubscriptionType
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date

@Schema(requiredProperties = ["orgId", "subscriptionType", "subscriptionId", "expirationTime", "expirationUpdateTime"])
data class SubscriptionMetadata(
    val orgId: String,
    val subscriptionType: SubscriptionType,
    val subscriptionId: String,
    val createdBy: String?,
    val expirationTime: Date?,
    val expirationUpdateTime: Date,
)

@Singleton
class SubscriptionMetadataDAO @Inject constructor(private val mapper: DynamoDBMapper) :
    DynamoCRUD<SubscriptionMetadataItem, SubscriptionMetadata, ItemId.String>,
    JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = SubscriptionMetadataItem::class.java

    override fun createId(item: SubscriptionMetadataItem): ItemId.String {
        return ItemId.String(item.orgId)
    }

    override fun toItem(apiModel: SubscriptionMetadata): SubscriptionMetadataItem {
        return SubscriptionMetadataItem(
            orgId = apiModel.orgId,
            subscriptionType = apiModel.subscriptionType,
            subscriptionId = apiModel.subscriptionId,
            createdBy = apiModel.createdBy,
            expirationTime = apiModel.expirationTime,
            expirationUpdateTime = apiModel.expirationUpdateTime
        )
    }

    override fun toApiModel(item: SubscriptionMetadataItem): SubscriptionMetadata {
        return SubscriptionMetadata(
            orgId = item.orgId,
            subscriptionType = item.subscriptionType,
            subscriptionId = item.subscriptionId,
            createdBy = item.createdBy,
            expirationTime = item.expirationTime,
            expirationUpdateTime = item.expirationUpdateTime ?: throw IllegalArgumentException("item missing expiration_update_time")
        )
    }

    override fun getListIndex(): String {
        return SubscriptionMetadataItem.Index
    }
}

package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.AWSMarketplaceMetadataItem
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.MarketplaceDimensions
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.marketplaceentitlement.model.Entitlement
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.lang.IllegalStateException
import java.util.Date

@Schema(requiredProperties = ["orgId", "awsMarketplaceCustomerId", "awsMarketplaceProductCode", "dimension", "expirationTime", "expirationUpdateTime"])
data class AWSMarketplaceMetadata(
    val orgId: String,
    val awsMarketplaceCustomerId: String,
    val awsMarketplaceProductCode: String,
    val createdBy: String?,
    val dimension: MarketplaceDimensions,
    val expirationTime: Date,
    val expirationUpdateTime: Date,
)

private fun validateCustomerEntitlements(entitlements: List<Entitlement>, customerId: String): Entitlement {
    // There should be a single entitlement for a single customer
    if (entitlements.size != 1) {
        throw IllegalStateException("Got unexpected entitlements (${entitlements.size}) for $customerId")
    }
    val e = entitlements.first()
    if (customerId != e.customerIdentifier) {
        throw IllegalArgumentException("Customer id $customerId doesn't match id in entitlement ${e.customerIdentifier}")
    }
    return e
}

fun getEntitlementQuantity(entitlements: List<Entitlement>, customerId: String): Int {
    return validateCustomerEntitlements(entitlements, customerId).value.integerValue
}

fun getMarketplaceMetadata(entitlements: List<Entitlement>, customerId: String): AWSMarketplaceMetadata {
    val e = validateCustomerEntitlements(entitlements, customerId)
    return AWSMarketplaceMetadata(
        orgId = "", // Don't have an org id at this point so it has to be set when one is created
        awsMarketplaceCustomerId = e.customerIdentifier,
        awsMarketplaceProductCode = e.productCode,
        dimension = MarketplaceDimensions.valueOf(e.dimension),
        expirationTime = e.expirationDate,
        expirationUpdateTime = Date(),
        createdBy = null,
    )
}

@Singleton
class AWSMarketplaceMetadataDAO @Inject constructor(private val mapper: DynamoDBMapper) :
    DynamoCRUD<AWSMarketplaceMetadataItem, AWSMarketplaceMetadata, ItemId.String>,
    JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = AWSMarketplaceMetadataItem::class.java

    override fun createId(item: AWSMarketplaceMetadataItem): ItemId.String {
        return ItemId.String(item.orgId)
    }

    override fun update(item: AWSMarketplaceMetadataItem) {
        if (item.expiration_update_time == null) {
            throw IllegalArgumentException(
                """
                expiration_update_time was null when updating marketplace metadata.
                Use updatePartial instead to avoid deleting that field, or explicitly
                set it to 'now' if expiration_time is being updated.
                """.trimIndent()
            )
        }

        super.update(item)
    }

    override fun toItem(apiModel: AWSMarketplaceMetadata): AWSMarketplaceMetadataItem {
        return AWSMarketplaceMetadataItem(
            orgId = apiModel.orgId,
            awsMarketplaceCustomerId = apiModel.awsMarketplaceCustomerId,
            awsMarketplaceProductCode = apiModel.awsMarketplaceProductCode,
            createdBy = apiModel.createdBy,
            dimension = apiModel.dimension,
            expiration_time = apiModel.expirationTime,
            expiration_update_time = apiModel.expirationUpdateTime
        )
    }

    override fun toApiModel(item: AWSMarketplaceMetadataItem): AWSMarketplaceMetadata {
        return AWSMarketplaceMetadata(
            orgId = item.orgId,
            awsMarketplaceCustomerId = item.awsMarketplaceCustomerId,
            awsMarketplaceProductCode = item.awsMarketplaceProductCode,
            createdBy = item.createdBy,
            dimension = item.dimension,
            expirationTime = item.expiration_time,
            expirationUpdateTime = item.expiration_update_time ?: throw IllegalArgumentException("item missing expiration_update_time")
        )
    }

    override fun getListIndex(): String {
        return OrganizationItem.Index
    }
}

package ai.whylabs.songbird.subscription

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadata
import ai.whylabs.songbird.v0.dao.AWSMarketplaceMetadataDAO
import ai.whylabs.songbird.v0.dao.OrganizationMetadata
import ai.whylabs.songbird.v0.ddb.AWSMarketplaceMetadataItem
import ai.whylabs.songbird.v0.ddb.DdbConditions.shouldEq
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date

@Singleton
class SubscriptionValidator @Inject constructor(
    private val awsMarketplaceMetadataDAO: AWSMarketplaceMetadataDAO,
) : JsonLogging {

    fun validate(org: OrganizationMetadata): Subscription {
        if (org.subscriptionTier == SubscriptionTier.AWS_MARKETPLACE) {
            val marketplaceMetadataResponse = awsMarketplaceMetadataDAO.list(
                AWSMarketplaceMetadataItem(orgId = org.id),
                rangeKeyConditions = shouldEq("org_id", org.id)
            )
            val metadata = marketplaceMetadataResponse.firstOrNull() ?: throw IllegalStateException("Marketplace metadata not found")
            require(metadata.expirationTime.after(Date())) { "Marketplace entitlement expired" }
            return Subscription(
                org.subscriptionTier,
                metadata,
            )
        }

        return Subscription(org.subscriptionTier ?: SubscriptionTier.FREE, marketplaceMetadata = null)
    }
}

data class Subscription(
    val tier: SubscriptionTier,
    val marketplaceMetadata: AWSMarketplaceMetadata?,
)

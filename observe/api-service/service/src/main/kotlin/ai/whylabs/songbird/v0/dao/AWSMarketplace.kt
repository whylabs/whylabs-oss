package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.regions.Regions
import com.amazonaws.services.marketplaceentitlement.AWSMarketplaceEntitlement
import com.amazonaws.services.marketplaceentitlement.AWSMarketplaceEntitlementClientBuilder
import com.amazonaws.services.marketplaceentitlement.model.Entitlement
import com.amazonaws.services.marketplaceentitlement.model.GetEntitlementsRequest
import com.amazonaws.services.marketplacemetering.AWSMarketplaceMetering
import com.amazonaws.services.marketplacemetering.AWSMarketplaceMeteringClientBuilder
import com.amazonaws.services.marketplacemetering.model.ResolveCustomerRequest
import com.amazonaws.services.marketplacemetering.model.ResolveCustomerResult
import io.micronaut.context.annotation.Factory
import jakarta.inject.Inject
import jakarta.inject.Singleton

/**
 * The intent here is for no one to directly use the aws clients. Calling marketplace with them
 * is a little complicated so that logic is capture in [AWSMarketplace].
 */
@Factory
internal class MarketplaceFactory {
    @Singleton
    fun marketplaceMeteringClient(config: EnvironmentConfig, credentialsProvider: AWSCredentialsProvider): AWSMarketplaceMetering {
        return AWSMarketplaceMeteringClientBuilder.standard()
            .withRegion(config.getRegion())
            .withCredentials(credentialsProvider)
            .build()
    }

    @Singleton
    fun marketplaceEntitlementClient(credentialsProvider: AWSCredentialsProvider): AWSMarketplaceEntitlement {
        return AWSMarketplaceEntitlementClientBuilder.standard()
            .withRegion(Regions.US_EAST_1) // They only use east 1 it seems
            .withCredentials(credentialsProvider)
            .build()
    }
}

/**
 * DAO for interfacing with the AWS marketplace API, which is a little cumbersome.
 */
@Singleton
class AWSMarketplace @Inject constructor(
    private val awsMarketplaceEntitlement: AWSMarketplaceEntitlement,
    private val awsMarketplaceMetering: AWSMarketplaceMetering,
    private val envConfig: EnvironmentConfig

) : JsonLogging {
    fun resolveCustomerId(customerIdToken: String): ResolveCustomerResult {
        return awsMarketplaceMetering.resolveCustomer(
            ResolveCustomerRequest()
                .withRegistrationToken(customerIdToken)
        )
    }

    private fun resolveCustomerEntitlements(customerId: String): List<Entitlement> {
        val entitlements = mutableListOf<Entitlement>()
        // Lookup the dimension they subscribed to. This is called an "entitlement" in marketplace lingo.
        val request = GetEntitlementsRequest()
            .withProductCode(envConfig.getEnv(EnvironmentVariable.AWSMarketplaceProductCode))
            .withFilter(mutableMapOf("CUSTOMER_IDENTIFIER" to listOf(customerId)))
            .withMaxResults(10)
        var response = awsMarketplaceEntitlement.getEntitlements(request)
        entitlements.addAll(response.entitlements)
        var paginationLimit = 100
        while (response.nextToken != null) {
            paginationLimit--
            response = awsMarketplaceEntitlement.getEntitlements(request.withNextToken(response.nextToken))
            entitlements.addAll(response.entitlements)
            if (paginationLimit <= 0) {
                log.error("Error fetching entitlements for customer $customerId. Received more paginated tokens than limit.")
                break
            }
        }
        return entitlements
    }

    fun getCustomerEntitlementQuantity(customerId: String): Int {
        val entitlements = resolveCustomerEntitlements(customerId)
        return getEntitlementQuantity(entitlements, customerId)
    }

    fun getCustomerEntitlementMetadata(customerId: String): AWSMarketplaceMetadata {
        val entitlements = resolveCustomerEntitlements(customerId)
        return getMarketplaceMetadata(entitlements, customerId)
    }
}

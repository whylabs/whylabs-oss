package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.v0.dao.SubscriptionMetadataDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionKey
import ai.whylabs.songbird.v0.ddb.SubscriptionMetadataItem
import com.stripe.StripeClient
import com.stripe.model.Product
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/subscriptions")
@WhyLabsInternal
@Tags(
    Tag(name = "Subscription", description = "Endpoint for subscription operations"),
    Tag(name = "Internal", description = "Internal API"),
)
@Secured(SecurityValues.WhyLabsAdministratorRole, SecurityValues.WhyLabsSystemRole)
class SubscriptionController @Inject constructor(
    val config: EnvironmentConfig,
    private val stripeClient: StripeClient,
    private val subscriptionMetadataDAO: SubscriptionMetadataDAO,
) : JsonLogging {
    @Operation(
        operationId = "GetOrganizationSubscriptions",
        summary = "Get organization subscription details",
        description = "Get organization subscription details",
    )
    @Get(
        uri = "/org/{org_id}",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getOrganizationSubscriptions(org_id: String): List<SubscriptionSummary> {
        val subscriptionItem = SubscriptionMetadataItem(key = SubscriptionKey(org_id))
        val subscriptionMetadata = subscriptionMetadataDAO.load(subscriptionItem) ?: throw ResourceNotFoundException("subscription", org_id)
        val stripeSubscription = stripeClient.subscriptions().retrieve(subscriptionMetadata.subscriptionId)
        return stripeSubscription.items.data.map { data ->
            val stripeProduct = stripeClient.products().retrieve(data.plan.product)
            val billingInterval = data.price.recurring.interval
            SubscriptionSummary(
                orgId = org_id,
                subscriptionId = stripeSubscription.id,
                status = stripeSubscription.status,
                product = stripeProduct.toSubscriptionProductSummary(),
                billingInterval = billingInterval,
                created = stripeSubscription.created,
                currentPeriodEnd = stripeSubscription.currentPeriodEnd,
                cancelledAtPeriodEnd = stripeSubscription.cancelAtPeriodEnd,
                cancelledAt = stripeSubscription.canceledAt,
            )
        }
    }
}

@Schema(description = "Summary of a subscription")
data class SubscriptionSummary(
    val orgId: String,
    val subscriptionId: String,
    val status: String,
    val product: SubscriptionProductSummary,
    val billingInterval: String,
    val created: Long,
    val currentPeriodEnd: Long,
    val cancelledAtPeriodEnd: Boolean,
    val cancelledAt: Long? = null,
)

@Schema(description = "Summary of a subscription product")
data class SubscriptionProductSummary(
    val name: String,
    val description: String,
    val features: List<SubscriptionProductFeature>?,
)

@Schema(description = "Summary of a subscription product feature")
data class SubscriptionProductFeature(
    val name: String,
)

fun Product.toSubscriptionProductSummary(): SubscriptionProductSummary {
    return SubscriptionProductSummary(
        name = this.name,
        description = this.description,
        features = this.features.map { SubscriptionProductFeature(name = it.name) },
    )
}

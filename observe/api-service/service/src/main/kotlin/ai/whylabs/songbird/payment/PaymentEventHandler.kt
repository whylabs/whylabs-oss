package ai.whylabs.songbird.payment

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.EmptyResourceException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.SubscriptionMetadataDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionKey
import ai.whylabs.songbird.v0.ddb.SubscriptionMetadataItem
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.ddb.SubscriptionType
import com.stripe.model.checkout.Session
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date

@Singleton
class PaymentEventHandler @Inject constructor(
    private val organizationDAO: OrganizationDAO,
    private val subscriptionMetadataDAO: SubscriptionMetadataDAO,
) : JsonLogging {

    suspend fun paymentCompleteEvent(session: Session) {
        val orgId = session.clientReferenceId
        val org = organizationDAO.getOrganizationOrNull(orgId) ?: throw ResourceNotFoundException("organization", orgId)
        if (org.subscriptionTier == SubscriptionTier.AWS_MARKETPLACE) {
            throw IllegalArgumentException("Organization $orgId is already subscribed with AWS Marketplace")
        }
        val subscription = session.subscription ?: throw EmptyResourceException("session_subscription", session.subscription)
        val customer = session.customer ?: throw EmptyResourceException("session_customer", session.customer)
        val subscriptionMetadata = SubscriptionMetadataItem(
            key = SubscriptionKey(orgId),
            orgId = orgId,
            subscriptionType = SubscriptionType.STRIPE,
            subscriptionId = subscription,
            createdBy = customer,
            expirationTime = null,
            expirationUpdateTime = Date(),
        )
        subscriptionMetadataDAO.create(subscriptionMetadata)
        organizationDAO.updateOrganization(org.copy(subscriptionTier = SubscriptionTier.SUBSCRIPTION))
    }

    suspend fun subscriptionDeleteEvent(subscriptionId: String, subscriptionType: SubscriptionType) {
        val metadata = SubscriptionMetadataItem(
            subscriptionType = subscriptionType,
            subscriptionId = subscriptionId,
        )
        val item = subscriptionMetadataDAO.list(metadata, SubscriptionMetadataItem.Index).toList().firstOrNull()
            ?: throw ResourceNotFoundException("payment subscription", subscriptionId)
        val org = organizationDAO.getOrganizationOrNull(item.orgId) ?: throw ResourceNotFoundException("organization", item.orgId)
        organizationDAO.updateOrganization(org.copy(subscriptionTier = SubscriptionTier.FREE))
        log.info("Downgraded organization ${org.id} from ${org.subscriptionTier} to free tier.")
        subscriptionMetadataDAO.delete(SubscriptionMetadataItem(key = SubscriptionKey(item.orgId)))
        log.info("Deleted subscription metadata for cancelled subscription $subscriptionId.")
    }
}

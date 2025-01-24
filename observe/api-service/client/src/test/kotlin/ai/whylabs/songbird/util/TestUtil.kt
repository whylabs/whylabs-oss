package ai.whylabs.songbird.util

import ai.whylabs.songbird.client.api.SongbirdClients
import ai.whylabs.songbird.client.infrastructure.ClientException
import ai.whylabs.songbird.client.model.AddMembershipRequest
import ai.whylabs.songbird.client.model.CreateUserRequest
import ai.whylabs.songbird.client.model.MembershipMetadata
import ai.whylabs.songbird.client.model.ModelMetadataResponse
import ai.whylabs.songbird.client.model.ModelType
import ai.whylabs.songbird.client.model.OrganizationSummary
import ai.whylabs.songbird.client.model.RemoveMembershipRequest
import ai.whylabs.songbird.client.model.Role
import ai.whylabs.songbird.client.model.SubscriptionTier
import ai.whylabs.songbird.client.model.TimePeriod
import ai.whylabs.songbird.client.model.User
import com.github.michaelbull.retry.policy.RetryPolicy
import com.github.michaelbull.retry.policy.binaryExponentialBackoff
import com.github.michaelbull.retry.policy.fullJitterBackoff
import com.github.michaelbull.retry.policy.limitAttempts
import com.github.michaelbull.retry.policy.plus
import com.github.michaelbull.retry.retry
import kotlinx.coroutines.runBlocking
import java.util.UUID

inline fun <reified T : Throwable> assertThrows(block: () -> Unit) {
    try {
        block()
    } catch (t: Throwable) {
        if (t !is T) {
            throw WrongFailureException("Test should have failed with a ${T::class.java}, instead failed with ${t::class.java}", t)
        }
        return
    }

    throw IllegalStateException("Test should have failed with a ${T::class.java}")
}

class WrongFailureException(message: String, cause: Throwable) : Exception(message, cause)
class DidNotFailException(message: String) : Exception(message)

inline fun expectClientFailure(code: Int, tag: String = "", block: () -> Unit) {
    try {
        block()
        throw DidNotFailException("Test should have failed.")
    } catch (t: Throwable) {
        when (t) {
            is ClientException -> {
                if (t.statusCode == code) {
                    // good
                } else {
                    throw WrongFailureException("$tag Was expecting $code status, got ${t.statusCode}", t)
                }
            }
            else -> throw WrongFailureException("$tag Was expecting ClientException, got ${t::class.java}", t)

        }
    }
}

typealias DeleteFn = () -> Unit

private fun createOrg(
    tier: SubscriptionTier = SubscriptionTier.FREE,
    emailDomains: String? = "",
    name: String?
): Pair<OrganizationSummary, DeleteFn> {
    val org = SongbirdClients.OrgClient.createOrganization(
        name = name ?: "test-org-${UUID.randomUUID()}",
        subscriptionTier = tier,
        emailDomains = emailDomains,
        observatoryUrl = "none",
        overrideId = null,
        parentOrgId = null,
        storageBucketOverride = null,
        storageUriOverride = null,
        allowManagedMembershipUpdatesOnly = null,
        useCloudFront = null,
    )

    val delete: DeleteFn = {
        SongbirdClients.OrgClient.deleteOrganization(org.id)
    }
    return Pair(org, delete)
}

fun withNewOrg(tier: SubscriptionTier = SubscriptionTier.FREE, emailDomains: String? = null, name: String? = null, block: (org: OrganizationSummary) -> Unit): OrganizationSummary {
    val (org, deleteOrg) = createOrg(tier, emailDomains, name)
    try {
        block(org)
    } finally {
        deleteOrg()
    }

    return org
}

fun withUser(block: (User) -> Unit) {
    val email = "foo+${UUID.randomUUID()}@whylabs.ai"
    val user = SongbirdClients.UserClient.createUser(CreateUserRequest(email = email))
    try {
        block(user)
    } finally {
        // TODO delete when we can delete users
    }
}

fun withMembership(orgId: String, email: String, block: (MembershipMetadata) -> Unit) {
    val membership = SongbirdClients.MembershipClient.createMembership(AddMembershipRequest(orgId = orgId, email = email, role = Role.MEMBER, default = false))
    waitUntilCount(1) { SongbirdClients.MembershipClient.getMembershipsByEmail(email, includeClaims = false).memberships.size }
    try {
        block(membership)
    } finally {
        SongbirdClients.MembershipClient.removeMembershipByEmail(RemoveMembershipRequest(orgId = orgId, email = email))
        waitUntilCount(0) { SongbirdClients.MembershipClient.getMembershipsByEmail(email, includeClaims = false).memberships.size }
    }
}


private val defaultRetryPolicy: RetryPolicy<Throwable> = limitAttempts(5) + fullJitterBackoff(base = 10, max = 1000)

fun withNewModel(orgId: String, block: (ModelMetadataResponse) -> Unit): ModelMetadataResponse {
    val model = SongbirdClients.ModelsApiClient.createModel(orgId, "model name", TimePeriod.P1D, ModelType.CLASSIFICATION, null)
    try {
        block(model)
    } finally {
        SongbirdClients.ModelsApiClient.deactivateModel(orgId, model.id)
    }

    return model
}

fun waitUntilCount(n: Int, block: () -> Int) {
    runBlocking {
        retry(binaryExponentialBackoff(50, 1000) + limitAttempts(15)) {
            if (block() != n) {
                throw IllegalStateException("GSI isn't up to date yet. If this happens then you probably need to rerun the tests unfortunately. If it always happens then theres a real issue.")
            }
        }
    }
}

fun waitUntilCondition(block: () -> Boolean, message: String = "Condition not met") {
    runBlocking {
        retry(binaryExponentialBackoff(50, 1000) + limitAttempts(15)) {
            if (!block()) {
                throw IllegalStateException(message)
            }
        }
    }
}

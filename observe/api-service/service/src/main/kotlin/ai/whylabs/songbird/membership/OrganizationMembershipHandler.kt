package ai.whylabs.songbird.membership

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.MetadataUtils
import ai.whylabs.songbird.v0.controllers.MembershipNotFoundException
import ai.whylabs.songbird.v0.controllers.User
import ai.whylabs.songbird.v0.controllers.UserMembershipNotificationSqsMessage
import ai.whylabs.songbird.v0.controllers.UserNotFoundException
import ai.whylabs.songbird.v0.dao.ClaimMembershipDAO
import ai.whylabs.songbird.v0.dao.ClaimMembershipMetadata
import ai.whylabs.songbird.v0.dao.MembershipDAO
import ai.whylabs.songbird.v0.dao.MembershipMetadata
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.UserDAO
import ai.whylabs.songbird.v0.ddb.ClaimMembershipItem
import ai.whylabs.songbird.v0.ddb.MembershipItem
import ai.whylabs.songbird.v0.ddb.Role
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.ddb.UserItem
import com.amazonaws.services.sqs.AmazonSQS
import com.amazonaws.services.sqs.model.SendMessageRequest
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date
import kotlin.NoSuchElementException

@Singleton
class OrganizationMembershipHandler @Inject constructor(
    private val config: EnvironmentConfig,
    private val membershipDAO: MembershipDAO,
    private val claimMembershipDAO: ClaimMembershipDAO,
    private val organizationDAO: OrganizationDAO,
    private val userDAO: UserDAO,
    private val sqs: AmazonSQS,
) : JsonLogging {
    private val MAX_MEMBERSHIPS_PER_ORG = 25
    private val mapper = jacksonObjectMapper()

    // Claims are a special type of membership that are created when a user logs in with SAML and has associated claim mappings configured
    fun getUserClaimMembershipsByEmail(userEmail: String): List<Membership> {
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        val claimMemberships = claimMembershipDAO.list(ClaimMembershipItem(userId = user.userId)).toList()
        return claimMemberships.mapNotNull { it.toFullMemberships() }
    }

    fun createClaimMembership(userEmail: String, orgId: String, role: Role, default: Boolean? = false) {
        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)

        // For non-Self-serve orgs, ensure external users cannot be added if it's restricted to a specific domain
        val userEmailDomain = MetadataUtils.getDomain(userEmail)
        MetadataUtils.validateDomain(userEmailDomain, org)

        // Get existing user id for this email
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        val claimMembershipItem = ClaimMembershipItem(
            userId = user.userId,
            role = role,
            orgId = orgId,
            default = default ?: false,
            updateTime = Date(),
        )
        try {
            claimMembershipDAO.create(claimMembershipItem)
        } catch (e: Exception) {
            claimMembershipDAO.update(claimMembershipItem)
        }
    }

    fun deleteClaimMembership(user: User, orgId: String) {
        claimMembershipDAO.delete(ClaimMembershipItem(orgId = orgId, userId = user.userId))
    }

    fun getUserMembershipsById(userId: String, includeClaims: Boolean = false): List<Membership> {
        // Get existing user id for this email
        val memberships = membershipDAO.list(MembershipItem(userId = userId)).toList()

        if (includeClaims) {
            val claimMemberships = claimMembershipDAO.list(ClaimMembershipItem(userId = userId)).toList()
            return combineMemberships(memberships.toFullMemberships(), claimMemberships.mapNotNull { it.toFullMemberships() })
        } else {
            return memberships.toFullMemberships()
        }
    }

    fun getUserMembershipsByEmail(userEmail: String, includeClaims: Boolean = false): List<Membership> {
        // Email MUST be a query value. If its a path parameter then some calls will fail because of
        // special characters. Micronaut apparently doesn't do any automatic url escaping for paths

        // Get existing user id for this email
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        val memberships = membershipDAO.list(MembershipItem(userId = user.userId)).toList()
        if (includeClaims) {
            val claimMemberships = claimMembershipDAO.list(ClaimMembershipItem(userId = user.userId)).toList()
            return combineMemberships(memberships.toFullMemberships(), claimMemberships.mapNotNull { it.toFullMemberships() })
        } else {
            return memberships.toFullMemberships()
        }
    }

    fun listOrganizationMemberships(orgId: String, includeClaims: Boolean = false): List<Membership> {
        // validate org
        organizationDAO.getOrganization(orgId)
        val memberships = membershipDAO.list(MembershipItem(orgId = orgId), MembershipItem.OrgMembersIndex).toList().toFullMemberships()

        if (includeClaims) {
            val claimMemberships = claimMembershipDAO.list(ClaimMembershipItem(orgId = orgId), ClaimMembershipItem.OrgMembersIndex).mapNotNull { it.toFullMemberships() }
            return combineMemberships(memberships, claimMemberships.toList())
        } else {
            return memberships
        }
    }

    fun createOrganizationMembership(userEmail: String, orgId: String, role: Role, createdBy: String? = null, default: Boolean? = false): MembershipMetadata {
        val org = organizationDAO.getOrganization(orgId, refreshCacheEntry = true)

        // For non-Self-serve orgs, ensure external users cannot be added if it's restricted to a specific domain
        val userEmailDomain = MetadataUtils.getDomain(userEmail)
        MetadataUtils.validateDomain(userEmailDomain, org)

        // Get existing user id for this email
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        val count = {
            membershipDAO.count(
                MembershipItem(orgId = org.id, userId = user.userId),
                MembershipItem.OrgMembersIndex, limit = MAX_MEMBERSHIPS_PER_ORG
            )
        }
        if (org.subscriptionTier == SubscriptionTier.FREE && count() >= MAX_MEMBERSHIPS_PER_ORG) {
            throw IllegalArgumentException("Membership limit reached")
        }

        // TODO wrap these in a DDB Transactional write
        // Create the membership if it doesn't already exist
        var newMembership: MembershipMetadata
        try {
            newMembership = membershipDAO.create(
                MembershipItem(
                    userId = user.userId,
                    role = role,
                    orgId = orgId,
                    default = default ?: false
                )
            )
            log.info("Created membership for $orgId default $default")
        } catch (e: IllegalArgumentException) {
            // Provide a more friendly message
            throw IllegalArgumentException("User $userEmail is already in organization $orgId")
        }

        if (default == true) {
            // If isDefault is set to true then we need to update the existing memberships so that
            // there is only a single one that is the default.
            membershipDAO.list(MembershipItem(userId = user.userId)).toList()
                // Filter out the one we just created
                .filter { it.orgId != orgId && it.userId != user.userId }
                .forEach {
                    if (it.orgId != orgId) {
                        membershipDAO.update(membershipDAO.toItem(it.copy(default = false)))
                    }
                }
        }

        sendUserMembershipNotificationMessage(sqs, config, org.id, org.name, user.userId, user.email, createdBy)

        return newMembership
    }

    fun updateOrganizationMembership(userEmail: String, orgId: String, role: Role): MembershipMetadata {
        // Get the user
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase())).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        // Find the membership
        val membership = membershipDAO.load(MembershipItem(userId = user.userId, orgId = orgId)) ?: throw MembershipNotFoundException(user.userId, orgId)
        val updatedMembership = membership.copy(role = role)
        membershipDAO.update(membershipDAO.toItem(updatedMembership))

        return updatedMembership
    }

    fun deleteOrganizationMembership(userEmail: String, orgId: String) {
        // Get existing user id for this email
        val user = try {
            userDAO.list(UserItem(email = userEmail.lowercase()), limit = 1).first()
        } catch (e: NoSuchElementException) {
            throw UserNotFoundException(null, userEmail)
        }

        // Delete the membership in the org
        deleteMembershipById(user.userId, orgId)
    }

    fun deleteMembershipById(userId: String, orgId: String) {
        var deleted = false
        try {
            // Delete the membership in the org
            membershipDAO.delete(MembershipItem(orgId = orgId, userId = userId))
            deleted = true
        } catch (e: Exception) {
            // Membership not found, but it could be a claim-membership
        }

        try {
            claimMembershipDAO.delete(ClaimMembershipItem(orgId = orgId, userId = userId))
            deleted = true
        } catch (e: Exception) {
            // Claim membership not found, but it could be a regular membership
        }

        if (!deleted) {
            throw MembershipNotFoundException(userId, orgId)
        }

        // If it was the default membership then make one of the other memberships the default.
        val memberships = membershipDAO.list(MembershipItem(userId = userId)).toList()
            // The list will read from a GSI so it may still include the deleted item. We have to manually filter it out as well.
            .filter { it.orgId != orgId && it.userId != userId }
        val hasDefault = memberships.any { it.default }
        if (!hasDefault) {
            // assuming there are any memberships at all
            memberships.firstOrNull()?.let {
                membershipDAO.update(membershipDAO.toItem(it.copy(default = true)))
            }
        }
    }

    private fun List<MembershipMetadata>.toFullMemberships(): List<Membership> {
        return this.mapNotNull {
            val user = userDAO.load(UserItem(userId = it.userId))
            if (user == null) {
                null
            } else {
                Membership(
                    orgId = it.orgId,
                    role = it.role,
                    userId = it.userId,
                    email = user.email,
                    default = it.default
                )
            }
        }
    }

    private fun ClaimMembershipMetadata.toFullMemberships(): Membership? {
        val user = userDAO.load(UserItem(userId = this.userId))
        return if (user == null) {
            null
        } else {
            Membership(
                orgId = this.orgId,
                role = this.role,
                userId = this.userId,
                email = user.email,
                default = this.default
            )
        }
    }

    private fun combineMemberships(memberships: List<Membership>, claimMemberships: List<Membership>): List<Membership> {
        val allMemberships = memberships + claimMemberships
        // Among elements of the given sequence with equal keys, only the first one will be present in the resulting sequence.
        // Regular membership should appear before claim membership in the list
        return allMemberships.distinctBy { "${it.orgId}#${it.userId}" }
    }

    private fun sendUserMembershipNotificationMessage(sqs: AmazonSQS, config: EnvironmentConfig, orgId: String, orgName: String, userId: String, userEmail: String, createdBy: String? = null) {
        val queueName = config.getEnv(EnvironmentVariable.UserMembershipQueueArn).substringAfterLast(":")
        val url = sqs.getQueueUrl(queueName).queueUrl
        val body = UserMembershipNotificationSqsMessage(orgId, orgName, userId, userEmail, createdBy)
        log.info("Sending message to user membership notification sqs: $body")
        val message = SendMessageRequest()
            .withQueueUrl(url)
            .withMessageBody(mapper.writeValueAsString(body))

        sqs.sendMessage(message)
    }
}

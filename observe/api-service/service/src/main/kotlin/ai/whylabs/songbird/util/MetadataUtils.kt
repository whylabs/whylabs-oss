package ai.whylabs.songbird.util

import ai.whylabs.songbird.v0.dao.OrganizationMetadata
import ai.whylabs.songbird.v0.ddb.SubscriptionTier

object MetadataUtils {
    fun getDomain(fullEmailAddress: String?): String {
        val domain = fullEmailAddress?.split("@")?.last()
        return domain ?: ""
    }

    private fun commaSeparatedToList(commaSeparated: String?): List<String> {
        return if (commaSeparated.isNullOrEmpty()) emptyList() else commaSeparated.split(",").map { it.trim().lowercase() }
    }

    fun validateDomain(userEmailDomain: String, org: OrganizationMetadata) {
        val domains = org.emailDomains ?: ""
        val listOfDomains = commaSeparatedToList(domains)
        if (
            org.subscriptionTier != SubscriptionTier.FREE &&
            listOfDomains.isNotEmpty() &&
            userEmailDomain.lowercase() !in listOfDomains
        ) {
            throw IllegalArgumentException(
                "Cannot add user with email domain $userEmailDomain to org ${org.id}:" +
                    " org memberships restricted to domains $domains"
            )
        }
    }

    fun reconcileDomains(domain: String?, domains: String?): Pair<String?, String?> {
        // Fallback to the old domain if domains field is empty
        if (domains.isNullOrEmpty()) {
            return Pair(domain, domain)
        }
        // If domains field isn't empty, at least ensure there is a valid entry in domain
        return Pair(commaSeparatedToList(domains).first(), domains)
    }
}

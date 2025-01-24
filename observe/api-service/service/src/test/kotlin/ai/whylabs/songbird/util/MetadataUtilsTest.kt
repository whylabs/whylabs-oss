package ai.whylabs.songbird.util

import ai.whylabs.songbird.v0.dao.OrganizationMetadata
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

internal class MetadataUtilsTest {

    private fun createMetadata(
        id: String = "org-1",
        name: String = "Test",
        subscriptionTier: SubscriptionTier? = SubscriptionTier.PAID,
        emailDomains: String? = null,
        observatoryUrl: String? = "",
        creationTime: Long = 0,
        deleted: Boolean = false,
        useCloudFront: Boolean = true,
        parentOrgId: String? = null,
    ): OrganizationMetadata {
        return OrganizationMetadata(
            id,
            name,
            subscriptionTier,
            emailDomains,
            observatoryUrl,
            creationTime,
            deleted,
            useCloudFront,
            parentOrgId,
        )
    }

    @Test
    fun `validateDomain passes if null or empty domain`() {
        MetadataUtils.validateDomain("gmail.com", createMetadata(emailDomains = null))
        MetadataUtils.validateDomain("gmail.com", createMetadata(emailDomains = ""))
    }

    @Test
    fun `validateDomain is case insensitive`() {
        MetadataUtils.validateDomain("gMail.com", createMetadata(emailDomains = "Gmail.com"))
    }

    @Test
    fun `validateDomain uses trimmed emailDomains if not null`() {
        MetadataUtils.validateDomain("gmail.com", createMetadata(emailDomains = "gmail.com"))
        MetadataUtils.validateDomain("gmail.com", createMetadata(emailDomains = "whylabs.ai, gmail.com"))
        MetadataUtils.validateDomain("gmail.com", createMetadata(emailDomains = " whylabs.ai , gmail.com "))
    }

    @Test
    fun `reconcileDomains uses emailDomains if not null or empty`() {
        val (domain, domains) = MetadataUtils.reconcileDomains("something", "whylabs.ai, whylabs.com")
        Assertions.assertTrue(domain == "whylabs.ai")
        Assertions.assertTrue(domains == "whylabs.ai, whylabs.com")
    }

    @Test
    fun `reconcileDomains uses domain if emailDomains is null or empty`() {
        val (domain, domains) = MetadataUtils.reconcileDomains("whylabs.ai", "")
        Assertions.assertTrue(domain == "whylabs.ai")
        Assertions.assertTrue(domains == "whylabs.ai")
        val (domain2, domains2) = MetadataUtils.reconcileDomains("whylabs.ai", null)
        Assertions.assertTrue(domain2 == "whylabs.ai")
        Assertions.assertTrue(domains2 == "whylabs.ai")
    }

    @Test
    fun `reconcileDomains handles all null or empty`() {
        val (domain, domains) = MetadataUtils.reconcileDomains("", "")
        Assertions.assertTrue(domain == "")
        Assertions.assertTrue(domains == "")
        val (domain2, domains2) = MetadataUtils.reconcileDomains(null, null)
        Assertions.assertTrue(domain2 == null)
        Assertions.assertTrue(domains2 == null)
    }
}

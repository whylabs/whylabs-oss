package ai.whylabs.songbird.util

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import com.google.common.cache.CacheBuilder
import com.google.common.cache.CacheLoader
import com.google.common.cache.LoadingCache
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.concurrent.TimeUnit

@Singleton
class OrgUtils @Inject constructor(
    private val organizationDAO: OrganizationDAO
) : JsonLogging {
    private val orgSubscriptionTierCache: LoadingCache<String, SubscriptionTier> =
        CacheBuilder.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(1000)
            .build(
                CacheLoader.from { key: String ->
                    organizationDAO.getOrganization(key).subscriptionTier ?: SubscriptionTier.FREE
                }
            )

    fun cachedOrgSubscriptionTier(orgId: String): SubscriptionTier {
        return orgSubscriptionTierCache.get(orgId)
    }
}

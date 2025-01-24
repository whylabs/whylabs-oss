package ai.whylabs.songbird.util

import ai.whylabs.dataservice.model.Granularity
import ai.whylabs.songbird.DefaultObservatoryEndpoint
import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import jakarta.inject.Inject
import jakarta.inject.Singleton

sealed class ProfileId {
    data class ReferenceId(val referenceId: String) : ProfileId()
    data class BatchProfileTimestamp(val timestamp: Long, val granularity: Granularity) : ProfileId()
}

/**
 * The observatory only supports viewing three profiles at a time.
 */
private const val maxProfilesPerUrl = 3

@Singleton
class ObservatoryLinks @Inject constructor(
    private val config: EnvironmentConfig,
) {

    fun profileViewerLink(datasetId: String, profileIds: List<ProfileId>, sessionToken: String? = null): String {
        if (profileIds.isEmpty()) {
            throw IllegalArgumentException("Must provide at least one profile")
        }

        val observatoryEndpoint = config.getEnv(EnvironmentVariable.ObservatoryEndpoint, DefaultObservatoryEndpoint)
        val url = if (observatoryEndpoint.endsWith("/")) observatoryEndpoint else "$observatoryEndpoint/"

        val sessionQuery = if (sessionToken != null) "&sessionToken=$sessionToken" else ""

        val profileQuery = profileIds.take(maxProfilesPerUrl).joinToString("&") {
            when (it) {
                is ProfileId.ReferenceId -> "profile=${it.referenceId}"
                is ProfileId.BatchProfileTimestamp -> "profile=${it.timestamp.truncate(it.granularity)}"
            }
        }

        return "${url}resources/$datasetId/profiles?$profileQuery$sessionQuery"
    }
}

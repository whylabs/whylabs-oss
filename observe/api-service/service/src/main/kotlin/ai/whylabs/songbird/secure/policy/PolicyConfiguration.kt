package ai.whylabs.songbird.secure.policy

import io.swagger.v3.oas.annotations.media.Schema
import java.util.Date

@Schema(description = "Storage for policy configuration")
data class PolicyConfiguration(
    val orgId: String,
    val datasetId: String,
    val policy: String,
    val version: String,
    val label: String?,
    val author: String?,
    val identity: String?,
    val source: String?,
    val creationTime: Date,
)

fun PolicyConfiguration.toPolicyConfigurationListEntry(includePolicy: Boolean): PolicyConfigurationListEntry {
    return PolicyConfigurationListEntry(
        orgId = orgId,
        datasetId = datasetId,
        version = version,
        label = label,
        policy = if (includePolicy) policy else null,
        author = author,
        identity = identity,
        source = source,
        creationTime = creationTime,
    )
}

@Schema(description = "Storage for policy configuration list entry")
data class PolicyConfigurationListEntry(
    val orgId: String,
    val datasetId: String,
    val version: String,
    val label: String?,
    val policy: String?,
    val author: String?,
    val identity: String?,
    val source: String?,
    val creationTime: Date,
)

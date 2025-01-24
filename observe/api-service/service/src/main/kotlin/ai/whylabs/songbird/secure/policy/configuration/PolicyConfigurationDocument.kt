package ai.whylabs.songbird.secure.policy.configuration

import com.fasterxml.jackson.annotation.JsonProperty

data class PolicyConfigurationDocument(
    val id: String,
    @get:JsonProperty("policy_version")
    val policyVersion: Int,
    @get:JsonProperty("schema_version")
    val schemaVersion: String,
    @get:JsonProperty("whylabs_dataset_id")
    val whylabsDatasetId: String,
    val rulesets: List<Ruleset>?
)

data class PolicyConfigurationMetadata(
    val id: String,
    val policyVersion: Int,
    val whylabsDatasetId: String,
)

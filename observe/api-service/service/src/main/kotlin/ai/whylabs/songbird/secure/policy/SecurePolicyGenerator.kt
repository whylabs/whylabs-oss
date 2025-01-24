package ai.whylabs.songbird.secure.policy

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.secure.policy.configuration.PolicyConfigurationMetadata
import ai.whylabs.songbird.secure.policy.configuration.UIPolicyConfiguration
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class SecurePolicyGenerator @Inject constructor(
    private val policyValidator: PolicyValidator,
) : JsonLogging {
    val yamlReader = ObjectMapper(YAMLFactory())

    fun generatePolicy(policy: PolicyConfiguration, schemaVersion: PolicySchemaVersion): String {
        val orgId = policy.orgId
        val datasetId = policy.datasetId
        var policyConfiguration = policy.policy
        var validatePolicySchema = true
        if (policy.source == PolicySource.UI.value) {
            // Generate base policy from UI components
            val obj = yamlReader.readValue(policy.policy, UIPolicyConfiguration::class.java)
            val policyVersion = policy.version.toInt()
            val document = obj.toPolicyConfigurationDocument(PolicyConfigurationMetadata("$orgId#$datasetId#$policyVersion", policyVersion, datasetId))
            val documentAsString = yamlReader.writeValueAsString(document)
            if (obj.advancedSettings != null || obj.callbackSettings != null) {
                validatePolicySchema = false
            }

            val advancedSettings = obj.advancedSettings.takeIf { !it?.trim().isNullOrBlank() } ?: "{}"
            val callbackSettings = obj.callbackSettings.takeIf { !it?.trim().isNullOrBlank() } ?: "{}"
            val source1 = yamlReader.readValue(documentAsString, Map::class.java)
            val source2 = try {
                yamlReader.readValue(advancedSettings, Map::class.java)
            } catch (e: Exception) {
                log.info("Failed to parse advanced settings for $orgId $datasetId version: ${policy.version}")
                emptyMap<String, Any>()
            }
            val source3 = try {
                yamlReader.readValue(callbackSettings, Map::class.java)
            } catch (e: Exception) {
                log.info("Failed to parse callback settings for $orgId $datasetId version: ${policy.version}")
                emptyMap<String, Any>()
            }

            val merged = source1.toMutableMap()
            merged.putAll(source2)
            merged.putAll(source3)

            policyConfiguration = yamlReader.writeValueAsString(merged)
        }
        if (validatePolicySchema) {
            policyValidator.checkValidPolicyConfiguration(policyConfiguration)
        }

        val policyAsMap = yamlReader.readValue(policyConfiguration, Map::class.java).toMutableMap()
        when (schemaVersion) {
            PolicySchemaVersion.V0_0_1 -> {
                policyAsMap.remove("org_id")
                policyAsMap["schema_version"] = PolicySchemaVersion.V0_0_1.value
            }
            PolicySchemaVersion.V0_1_0 -> {
                policyAsMap["org_id"] = orgId
                policyAsMap["schema_version"] = PolicySchemaVersion.V0_1_0.value
            }
        }

        return yamlReader.writeValueAsString(policyAsMap)
    }
}

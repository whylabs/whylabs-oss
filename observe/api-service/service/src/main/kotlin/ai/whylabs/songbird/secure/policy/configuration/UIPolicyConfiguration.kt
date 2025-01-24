package ai.whylabs.songbird.secure.policy.configuration

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo

@JsonIgnoreProperties(ignoreUnknown = true)
class UIPolicyConfiguration(
    @JsonProperty("policies")
    val policies: List<UIPolicy>?,
    @JsonProperty("advancedSettings")
    val advancedSettings: String?,
    @JsonProperty("callbackSettings")
    val callbackSettings: String?,
) {
    internal fun toPolicyConfigurationDocument(metadata: PolicyConfigurationMetadata): PolicyConfigurationDocument {
        return PolicyConfigurationDocument(
            id = metadata.id,
            policyVersion = metadata.policyVersion,
            schemaVersion = "0.0.1",
            whylabsDatasetId = metadata.whylabsDatasetId,
            rulesets = policies
                ?.filter { it.enabled != false }
                ?.map { policy ->
                    val rulesetType = policy.toRulesetType()
                    Ruleset(
                        ruleset = rulesetType,
                        options = policy.toRulesetOption(rulesetType)
                    )
                }
        )
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
data class UIPolicy(
    @JsonProperty("id")
    val id: String?,
    @JsonProperty("enabled")
    val enabled: Boolean?,
    @JsonProperty("params")
    val params: List<UIPolicyParams>,
) {
    internal fun toRulesetType(): RulesetType {
        return when (id) {
            "bad-actors" -> RulesetType.score_bad_actors
            "cost" -> RulesetType.score_cost
            "customer-experience" -> RulesetType.score_customer_experience
            "misuse" -> RulesetType.score_misuse
            "truthfulness" -> RulesetType.score_truthfulness
            else -> throw IllegalArgumentException("Unknown ruleset type: $id")
        }
    }

    internal fun toRulesetOption(type: RulesetType): RulesetOption {
        val behavior = toRulesetOptionBehavior()
        val sensitivity = toRulesetOptionSensitivity()
        return when (type) {
            RulesetType.score_misuse -> {
                MisuseRulesetOption(
                    behavior = behavior,
                    sensitivity = sensitivity,
                    topics = toCheckboxGroupList("topics")
                )
            }
            RulesetType.score_truthfulness -> {
                val validationMethod = toCheckboxGroupList("validation-method")
                TruthfulnessRulesetOption(
                    behavior = behavior,
                    sensitivity = sensitivity,
                    ragEnabled = validationMethod.contains("rag-context"),
                    hallucinationsEnabled = validationMethod.contains("llm-judge")
                )
            }
            else -> RulesetOption(behavior = behavior, sensitivity = sensitivity)
        }
    }

    private fun toRulesetOptionBehavior(): RulesetOptionBehavior {
        val behavior = params
            .filterIsInstance<SegmentedControlUIPolicyParams>()
            .filter { it.id == "behavior" }
            .map {
                when (it.value) {
                    "block" -> RulesetOptionBehavior.block
                    "flag" -> RulesetOptionBehavior.flag
                    "observe" -> RulesetOptionBehavior.observe
                    else -> RulesetOptionBehavior.observe
                }
            }.firstOrNull()
        return behavior ?: RulesetOptionBehavior.observe
    }

    private fun toRulesetOptionSensitivity(): RulesetOptionSensitivity {
        val sensitivity = params
            .filterIsInstance<SegmentedControlUIPolicyParams>()
            .filter { it.id == "sensitivity" }
            .map {
                when (it.value) {
                    "low" -> RulesetOptionSensitivity.low
                    "medium" -> RulesetOptionSensitivity.medium
                    "high" -> RulesetOptionSensitivity.high
                    else -> RulesetOptionSensitivity.low
                }
            }.firstOrNull()
        return sensitivity ?: RulesetOptionSensitivity.low
    }

    private fun toCheckboxGroupList(id: String): List<String> {
        return params
            .filterIsInstance<CheckboxGroupUIPolicyParams>()
            .filter { it.id == id }
            .map { it.value }
            .firstOrNull() ?: emptyList()
    }
}

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type",
    defaultImpl = GenericUIPolicyParams::class
)
@JsonSubTypes(
    JsonSubTypes.Type(value = SegmentedControlUIPolicyParams::class, name = "segmented-control"),
    JsonSubTypes.Type(value = CheckboxGroupUIPolicyParams::class, name = "checkbox-group")
)
@JsonIgnoreProperties(ignoreUnknown = true)
abstract class UIPolicyParams {
    @JsonProperty("type")
    val type: String? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
class GenericUIPolicyParams : UIPolicyParams()

@JsonIgnoreProperties(ignoreUnknown = true)
data class SegmentedControlUIPolicyParams(
    @JsonProperty("id")
    val id: String?,
    @JsonProperty("value")
    val value: String?
) : UIPolicyParams()

@JsonIgnoreProperties(ignoreUnknown = true)
data class CheckboxGroupUIPolicyParams(
    @JsonProperty("id")
    val id: String?,
    @JsonProperty("value")
    val value: List<String>?
) : UIPolicyParams()

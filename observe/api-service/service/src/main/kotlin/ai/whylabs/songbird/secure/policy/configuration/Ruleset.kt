package ai.whylabs.songbird.secure.policy.configuration

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty

@JsonIgnoreProperties(ignoreUnknown = true)
data class Ruleset(
    val ruleset: RulesetType,
    val options: RulesetOption,
)

open class RulesetOption(
    open val behavior: RulesetOptionBehavior,
    open val sensitivity: RulesetOptionSensitivity
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class MisuseRulesetOption(
    override val behavior: RulesetOptionBehavior,
    override val sensitivity: RulesetOptionSensitivity,
    val topics: List<String>,
) : RulesetOption(behavior, sensitivity)

@JsonIgnoreProperties(ignoreUnknown = true)
data class TruthfulnessRulesetOption(
    override val behavior: RulesetOptionBehavior,
    override val sensitivity: RulesetOptionSensitivity,
    @get:JsonProperty("rag_enabled")
    val ragEnabled: Boolean,
    @get:JsonProperty("hallucinations_enabled")
    val hallucinationsEnabled: Boolean,
) : RulesetOption(behavior, sensitivity)

enum class RulesetType {
    @JsonProperty("score.bad_actors")
    score_bad_actors,
    @JsonProperty("score.cost")
    score_cost,
    @JsonProperty("score.customer_experience")
    score_customer_experience,
    @JsonProperty("score.misuse")
    score_misuse,
    @JsonProperty("score.truthfulness")
    score_truthfulness,
}

enum class RulesetOptionBehavior {
    observe,
    flag,
    block,
}

enum class RulesetOptionSensitivity {
    low,
    medium,
    high,
}

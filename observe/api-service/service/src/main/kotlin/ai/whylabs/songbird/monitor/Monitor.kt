package ai.whylabs.songbird.monitor

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "Monitor entity in the configuration", requiredProperties = ["id"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class Monitor(
    @field:Schema(
        description = "Monitor identifier",
        example = "monitor-123",
    )
    val id: String,
    @field:Schema(
        description = "Monitor display name",
        example = "My monitor",
    )
    val displayName: String?,
    @field:Schema(
        description = "List of actions to take when the monitor is activated",
    )
    val actions: List<MonitorAction>?,
)

@Schema(description = "Monitor notification action", requiredProperties = ["type", "target"])
@JsonIgnoreProperties(ignoreUnknown = true)
data class MonitorAction(
    @field:Schema(
        description = "Monitor action target",
        example = "action-123",
    )
    val target: String,
    @field:Schema(
        description = "Monitor action type",
        example = "global",
    )
    val type: String,
)

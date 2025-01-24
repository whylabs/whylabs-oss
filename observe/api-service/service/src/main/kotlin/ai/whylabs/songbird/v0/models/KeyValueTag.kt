package ai.whylabs.songbird.v0.models

import io.swagger.v3.oas.annotations.media.Schema
import javax.validation.constraints.NotBlank

@Schema(description = "A key value tag")
data class KeyValueTag(
    @field:NotBlank val key: String,
    @field:NotBlank val value: String,
)

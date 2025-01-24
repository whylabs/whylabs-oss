package ai.whylabs.songbird.notification

import com.fasterxml.jackson.annotation.JsonProperty

class NotificationTestMessage(
    @JsonProperty("org_id")
    val orgId: String,
    @JsonProperty("action_id")
    val actionId: String
)

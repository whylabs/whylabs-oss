package ai.whylabs.songbird.v0.models

data class AuditLog(
    val messageId: String,
    val publishTime: String,
    val accountId: String,
    val apiKeyOwner: String,
    val apiKeyId: String,
    val eventName: String,
    val statusCode: String
)

data class AuditContent(
    val messageId: String,
    val content: String
)

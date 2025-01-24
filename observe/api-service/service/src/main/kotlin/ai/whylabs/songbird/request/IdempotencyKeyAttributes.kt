package ai.whylabs.songbird.request

data class IdempotencyKeyAttributes(
    val key: String,
    val orgId: String,
    val datasetId: String,
)

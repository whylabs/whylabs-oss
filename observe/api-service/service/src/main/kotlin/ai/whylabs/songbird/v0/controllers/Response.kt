package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.operations.getCurrentRequestId
import ai.whylabs.songbird.v0.dao.ModelMetadata
import ai.whylabs.songbird.v0.models.KeyValueTag
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Schema

data class Response(
    val requestId: String? = getCurrentRequestId()
)

data class StatusResponse(
    val requestId: String? = getCurrentRequestId(),
    val errors: List<ErrorStatus> = emptyList()
)

data class ErrorStatus(
    val errorCode: Int,
    val itemId: String? = null,
    val description: String? = null,
)

/**
 * Model
 */

@Schema(description = "Response for the model metadata", requiredProperties = ["id", "name"])
data class ModelMetadataResponse(
    val id: String,
    val orgId: String,
    val name: String,
    val creationTime: Long,
    val timePeriod: String,
    val modelType: String?,
    val modelCategory: String,
    val active: Boolean?,
    val tags: List<KeyValueTag>
)

fun ModelMetadata.toResponse(): ModelMetadataResponse {
    return ModelMetadataResponse(
        id = this.id,
        orgId = this.orgId,
        name = this.name,
        creationTime = this.creationTime ?: 0,
        timePeriod = this.timePeriod.name,
        modelType = this.modelType?.name,
        modelCategory = this.modelCategory.name,
        active = this.active,
        tags = this.tags
    )
}

@Schema(description = "Response for the ListModels API", requiredProperties = ["items"])
data class ListModelsResponse(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of all known model ids for an organization."),
        uniqueItems = true,
    )
    val items: List<ModelMetadataResponse>,
)

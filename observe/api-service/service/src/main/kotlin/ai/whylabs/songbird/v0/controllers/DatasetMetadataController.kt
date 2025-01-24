package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.PermanentlyRemovedException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Put
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/dataset/{dataset_id}")
@Tags(
    Tag(name = "Dataset Metadata", description = "Endpoint for dataset metadata."),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class DatasetMetadataController @Inject constructor() : JsonLogging {
    @Operation(
        operationId = "GetDatasetMetadata",
        summary = "Get dataset metadata for the specified dataset",
        description = "Get dataset metadata for the specified dataset",
    )
    @Deprecated("Only specific model fields are supported")
    @Get(
        uri = "/metadata",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getDatasetMetadata(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): GetDatasetMetadataResponse {
        log.warn("Unsupported GetDatasetMetadata operation called")
        throw PermanentlyRemovedException("Use specific fields available in the /models endpoint")
    }

    @Operation(
        operationId = "PutDatasetMetadata",
        summary = "Put dataset metadata for the specified dataset",
        description = "Put dataset metadata for the specified dataset",
    )
    @Deprecated("Only specific model fields are supported")
    @Put(
        uri = "/metadata",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun putDatasetMetadata(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body metadata: String,
    ): Response {
        log.warn("Unsupported PutDatasetMetadata operation called")
        throw PermanentlyRemovedException("Use specific fields available in the /models endpoint")
    }

    @Operation(
        operationId = "DeleteDatasetMetadata",
        summary = "Delete dataset metadata for the specified dataset",
        description = "Delete dataset metadata for the specified dataset",
    )
    @Deprecated("Only specific model fields are supported")
    @Delete(
        uri = "/metadata",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun deleteDatasetMetadata(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): Response {
        log.warn("Deprecated DeleteDatasetMetadata operation called")
        throw PermanentlyRemovedException("Use specific fields available in the /models endpoint")
    }
}

@Schema(description = "Response for getting dataset metadata", requiredProperties = ["metadata"])
data class GetDatasetMetadataResponse(
    @field:Schema(description = "Metadata information for the dataset")
    val metadata: String
)

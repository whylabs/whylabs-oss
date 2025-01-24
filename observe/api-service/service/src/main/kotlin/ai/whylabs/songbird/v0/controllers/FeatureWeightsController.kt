package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.feature.EntityWeightRecord
import ai.whylabs.songbird.feature.FeatureWeightStore
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.v0.dao.ModelDAO
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
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
    Tag(name = "Feature Weights", description = "Endpoint for feature weights"),
)
@Secured(SecurityValues.AdministratorRole, SecurityValues.UserRole)
class FeatureWeightsController @Inject constructor(
    private val featureWeightStore: FeatureWeightStore,
    private val modelDAO: ModelDAO,
) : JsonLogging {
    val mapper = jacksonObjectMapper()

    @Operation(
        operationId = "GetColumnWeights",
        summary = "Get column weights for the specified dataset",
        description = "Get column weights for the specified dataset",
    )
    @Get(
        uri = "/weights",
        produces = [MediaType.APPLICATION_JSON]
    )
    fun getColumnWeights(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): EntityWeightRecord {
        log.info("Getting the column weights for $org_id/$dataset_id")
        return featureWeightStore.load(org_id, dataset_id)
            ?: throw ResourceNotFoundException("No column weights found for dataset", dataset_id)
    }

    @Operation(
        operationId = "PutColumnWeights",
        summary = "Put column weights for the specified dataset",
        description = "Put column weights for the specified dataset",
    )
    @Put(
        uri = "/weights",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun putColumnWeights(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body body: String,
    ): Response {
        modelDAO.getModel(org_id, dataset_id)
        val entityWeightRecord = mapper.readValue<EntityWeightRecord>(body)
        log.info("Storing the column weights for $org_id/$dataset_id")
        featureWeightStore.store(org_id, dataset_id, entityWeightRecord)
        return Response()
    }

    @Operation(
        operationId = "DeleteColumnWeights",
        summary = "Delete column weights for the specified dataset",
        description = "Delete column weights for the specified dataset",
    )
    @Delete(
        uri = "/weights",
        consumes = [MediaType.APPLICATION_JSON]
    )
    fun deleteFeatureWeights(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): Response {
        log.info("Deleting the column weights for $org_id/$dataset_id")
        featureWeightStore.delete(org_id, dataset_id)
        return Response()
    }
}

@file:Suppress("RedundantSuspendModifier")

package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.MonitorConfigManager
import ai.whylabs.songbird.operations.AuditableResponseBody
import ai.whylabs.songbird.operations.ResourceAlreadyExistsException
import ai.whylabs.songbird.schema.ColumnSchema
import ai.whylabs.songbird.schema.EntitySchema
import ai.whylabs.songbird.schema.EntitySchemaStore
import ai.whylabs.songbird.schema.MetricSchema
import ai.whylabs.songbird.schema.MetricSchemaFields
import ai.whylabs.songbird.schema.NamedMetricSchema
import ai.whylabs.songbird.security.ApiKeyAuth
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.ReadResourceRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WriteResourceRole
import ai.whylabs.songbird.security.WhyLabsInternal
import ai.whylabs.songbird.subscription.SubscriptionValidator
import ai.whylabs.songbird.util.DocUtils
import ai.whylabs.songbird.util.DocUtils.Companion.OrganizationUri
import ai.whylabs.songbird.util.OrgUtils
import ai.whylabs.songbird.v0.dao.AWSMarketplace
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.ddb.MarketplaceDimensions
import ai.whylabs.songbird.v0.ddb.SubscriptionTier
import ai.whylabs.songbird.v0.models.ModelType
import ai.whylabs.songbird.v0.models.TimePeriod
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Delete
import io.micronaut.http.annotation.Get
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Put
import io.micronaut.http.annotation.QueryValue
import io.micronaut.security.annotation.Secured
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.inject.Inject

private const val MAX_MODELS_PER_ORG = 10

@SecurityRequirement(name = ApiKeyAuth)
@Controller("/v0/$OrganizationUri/models")
@Tag(name = "Models", description = "Interactions related to models.")
@Secured(AdministratorRole, UserRole)
class ModelController @Inject constructor(
    private val config: EnvironmentConfig,
    private val dataService: DataService,
    private val modelDAO: ModelDAO,
    private val organizationDAO: OrganizationDAO,
    private val subscriptionValidator: SubscriptionValidator,
    private val awsMarketplace: AWSMarketplace,
    private val monitorConfigManager: MonitorConfigManager,
    private val schemaStore: EntitySchemaStore,
    private val orgUtils: OrgUtils,
) : JsonLogging {
    /**
     * @param org_id Your company's unique organization ID
     * @return A list of model summary items
     */
    @Operation(
        operationId = "ListModels",
        summary = "Get a list of all of the model ids for an organization.",
        description = "Get a list of all of the model ids for an organization.",
    )
    @Get(uri = "/", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    suspend fun listModels(@Schema(example = DocUtils.ExampleOrgId) org_id: String): ListModelsResponse {
        log.info("Listing models for org {}", org_id)
        return ListModelsResponse(items = modelDAO.listModels(org_id, includeInactive = false).map { it.toResponse() })
    }

    /**
     * @param org_id The organization ID
     * @param model_name The name of a model
     * @param time_period The [TimePeriod] for data aggregation/alerting for a model
     * @param model_type The [ModelType] of the dataset
     * @return The [ModelMetadataResponse] if operation succeeds
     */
    @AuditableResponseBody
    @Operation(
        operationId = "CreateModel",
        summary = "Create a model with a given name and a time period",
        description = "Create a model",
    )
    @Post(uri = "/", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun createModel(
        @Schema(example = DocUtils.ExampleOrgId, maxLength = 128) org_id: String,
        @Schema(example = DocUtils.ExampleModelName, minLength = 4, maxLength = 512) @QueryValue model_name: String,
        @Schema(enumAsRef = true) @QueryValue time_period: TimePeriod,
        // schema with enumAsRef for ModelType does not compile; with example generates invalid type of object
        // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
        @Schema(nullable = false) @QueryValue model_type: ModelType?,
        @Schema(
            example = DocUtils.ExampleModelId,
            minLength = 4,
            maxLength = 128,
            pattern = "^[0-9a-zA-Z_-]+$"
        ) @QueryValue model_id: String? = null,
    ): ModelMetadataResponse {
        if (config.getEnv(EnvironmentVariable.KTLOMode, "false") == "true" && orgUtils.cachedOrgSubscriptionTier(org_id) == SubscriptionTier.FREE) {
            throw IllegalArgumentException("This operation is not allowed for this organization.")
        }

        val modelId = model_id ?: modelDAO.incrementAndGetModelId(org_id)
        log.info(
            "Creating model for org {} with time period {} and type {} with ID: {}",
            org_id,
            time_period,
            model_type,
            modelId
        )
        val org = organizationDAO.getOrganization(org_id, refreshCacheEntry = true)
        val count = {
            modelDAO.listModels(org_id, includeInactive = false).size
        }

        val subscription = subscriptionValidator.validate(org)
        if (subscription.tier == SubscriptionTier.AWS_MARKETPLACE) {
            val metadata =
                subscription.marketplaceMetadata ?: throw IllegalStateException("Marketplace metadata not found")

            if (metadata.dimension == MarketplaceDimensions.ENTERPRISE) {
                // do nothing. These limits are not yet enforced in the API.
            } else if (metadata.dimension == MarketplaceDimensions.BY_QUANTITY) {
                val entitlementQuantity =
                    awsMarketplace.getCustomerEntitlementQuantity(metadata.awsMarketplaceCustomerId)
                if (count() >= entitlementQuantity) {
                    throw IllegalArgumentException("Model limit quantity reached for marketplace")
                }
            } else if (count() >= metadata.dimension.limitValue) {
                throw IllegalArgumentException("Model limit dimension reached for marketplace")
            }
        }
        if (subscription.tier == SubscriptionTier.FREE && count() >= MAX_MODELS_PER_ORG) {
            throw IllegalArgumentException("Model limit reached")
        }

        try {
            return modelDAO.saveModel(org_id, modelId, model_name, time_period, model_type, expectExisting = false).toResponse()
        } catch (e: IllegalArgumentException) {
            throw ResourceAlreadyExistsException("model", "$org_id/$modelId")
        }
    }

    /**
     * @param org_id The name of an organization
     * @param model_id The ID of a model
     * @return A [ModelMetadataResponse] object if operation succeeds
     */
    @Operation(
        operationId = "GetModel",
        summary = "Get a model metadata",
        description = "Returns various metadata about a model",
    )
    @Get(uri = "/{model_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    fun getModel(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
    ): ModelMetadataResponse {
        log.info("Getting model for org {} and model {}", org_id, model_id)
        return modelDAO.getModel(org_id, model_id).toResponse()
    }

    /**
     * @param org_id The organization ID
     * @param model_id The model ID
     * @param model_name The name of a model
     * @param time_period The [TimePeriod] for data aggregation/alerting for a model
     * @param model_type The [ModelType] of the dataset
     * @return The [ModelMetadataResponse] if operation succeeds
     */
    @AuditableResponseBody
    @Operation(
        operationId = "UpdateModel",
        summary = "Update a model's metadata",
        description = "Update a model's metadata",
    )
    @Put(uri = "/{model_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun updateModel(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
        @Schema(example = DocUtils.ExampleModelName) @QueryValue model_name: String,
        @Schema(enumAsRef = true) @QueryValue time_period: TimePeriod,
        // schema with enumAsRef for ModelType does not compile; with example generates invalid type of object
        // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
        @Schema(nullable = false)
        @QueryValue model_type: ModelType? = null,
    ): ModelMetadataResponse {
        log.info(
            "Updating model for org {}, model {}. New time period {}, new type {}",
            org_id,
            model_id,
            time_period,
            model_type
        )

        val original = modelDAO.getModel(org_id, model_id)
        val updated = modelDAO.saveModel(org_id, model_id, model_name, time_period, model_type, expectExisting = true)

        // Update the monitor config which has a dependency on the model
        if (original.timePeriod != time_period) {
            val monitorConfig = monitorConfigManager.loadMonitorConfigBuilder(
                org_id,
                model_id,
                includeEntitySchema = false,
                includeEntityWeights = false
            )
                .addGranularity(time_period)
                .build()
            monitorConfigManager.store(org_id, model_id, monitorConfig.asJson())
        }

        return updated.toResponse()
    }

    /**
     * @param org_id The organization ID
     * @param model_id The model ID
     * @return The [ModelMetadataResponse] if operation succeeds
     */
    @AuditableResponseBody
    @Operation(
        operationId = "DeactivateModel",
        summary = "Mark a model as inactive",
        description = "Mark a model as inactive",
    )
    @Delete(uri = "/{model_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun deactivateModel(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleModelId) model_id: String,
    ): ModelMetadataResponse {
        log.info("Deleting model. Org {}, model {}", org_id, model_id)
        monitorConfigManager.handleModelDeletionEvent(org_id, model_id)
        return modelDAO.markInactive(org_id, model_id).toResponse()
    }

    @Operation(
        operationId = "GetEntitySchema",
        summary = "Get the entity schema config for a given dataset.",
        description = "Get the entity schema config for a given dataset."
    )
    @Get(uri = "/{dataset_id}/schema", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    fun getEntitySchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): EntitySchema {
        log.info("Getting the schema config for $org_id/$dataset_id")
        return schemaStore.load(org_id, dataset_id) ?: EntitySchema(emptyMap())
    }

    @WhyLabsInternal
    @Operation(
        operationId = "GetCachedEntitySchema",
        summary = "Get the cached entity schema config for a given dataset.",
        description = "Get the cached entity schema config for a given dataset.",
        tags = ["Internal"],
    )
    @Get(uri = "/{dataset_id}/cached-schema", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    fun getCachedEntitySchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(required = false) @QueryValue use_cached: Boolean?,
    ): EntitySchema {
        log.info("Getting the schema config for $org_id/$dataset_id")
        return schemaStore.load(org_id, dataset_id, use_cached ?: true) ?: EntitySchema(emptyMap())
    }

    @Operation(
        operationId = "PutEntitySchema",
        summary = "Save the entity schema config for a given dataset.",
        description = "Save the entity schema config for a given dataset."
    )
    @Put(uri = "/{dataset_id}/schema", produces = [MediaType.APPLICATION_JSON], consumes = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun putEntitySchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body config: EntitySchema,
    ): Response {
        log.info("Saving the entity schema config for $org_id/$dataset_id")
        schemaStore.store(org_id, dataset_id, config)
        return Response()
    }

    @Operation(
        operationId = "ReinferEntitySchema",
        summary = "Reinfers the entity schema config for a given dataset.",
        description = "Reinfers the type and discreteness for the columns in a given dataset. " +
            "Retains additional user information like tags and whether the column is input or output"
    )
    @Put(uri = "/{dataset_id}/schema/reinfer", produces = [MediaType.APPLICATION_JSON])
    fun reinferEntitySchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body request: ReinferEntitySchemaRequest,
    ): EntitySchema {
        log.info("Reinferring the schema config for $org_id/$dataset_id")
        return schemaStore.reinfer(org_id, dataset_id, request.interval)
    }

    @Operation(
        operationId = "DeleteEntitySchema",
        summary = "Delete the entity schema config for a given dataset.",
        description = "Delete the entity schema config for a given dataset."
    )
    @Delete(uri = "/{dataset_id}/schema", produces = [MediaType.APPLICATION_JSON], consumes = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    suspend fun deleteEntitySchema(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): Response {
        log.info("Deleting the entity schema config for $org_id/$dataset_id")
        schemaStore.delete(org_id, dataset_id)
        return Response()
    }

    @Operation(
        operationId = "GetEntitySchemaColumn",
        summary = "Get the entity schema of a single column for a given dataset.",
        description = "Get the entity schema of a single column for a given dataset."
    )
    @Get(uri = "/{dataset_id}/schema/column/{column_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    fun getEntitySchemaColumn(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleColumnId) column_id: String,
    ): ColumnSchema {
        log.info("Getting the column entity schema for $org_id/$dataset_id/$column_id")
        return schemaStore.loadColumn(org_id, dataset_id, column_id)
    }

    @AuditableResponseBody
    @Operation(
        operationId = "PutEntitySchemaColumn",
        summary = "Save the entity schema of a single column for a given dataset.",
        description = "Save the entity schema of a single column for a given dataset."
    )
    @Put(
        uri = "/{dataset_id}/schema/column/{column_id}",
        consumes = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun putEntitySchemaColumn(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleColumnId) column_id: String,
        @Body config: ColumnSchema,
    ): Response {
        log.info("Saving the column entity schema for $org_id/$dataset_id/$column_id")
        schemaStore.storeColumn(org_id, dataset_id, column_id, config)
        return Response()
    }

    @Operation(
        operationId = "DeleteEntitySchemaColumn",
        summary = "Delete the entity schema of a single column for a given dataset.",
        description = "Delete the entity schema of a single column for a given dataset."
    )
    @Delete(uri = "/{dataset_id}/schema/column/{column_id}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun deleteEntitySchemaColumn(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleColumnId) column_id: String,
    ): Response {
        log.info("Deleting the column entity schema for $org_id/$dataset_id/$column_id")
        schemaStore.deleteColumn(org_id, dataset_id, column_id)
        return Response()
    }

    @AuditableResponseBody
    @Operation(
        operationId = "PutNamedMetricSchema",
        summary = "Save the schema of a single named metric for a given dataset.",
        description = "Save the schema of a single named metric for a given dataset.",
    )
    @Put(
        uri = "/{dataset_id}/schema/metric/{metric_name}",
        consumes = [MediaType.APPLICATION_JSON]
    )
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun putNamedEntitySchemaMetric(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(
            description = "A name for the metric. This should be a unique across the metrics for the dataset and consist of alphanumeric plus _ and . characters.",
            example = DocUtils.ExampleMetricName
        )
        metric_name: String,
        @Body config: MetricSchemaFields,
    ): Response {
        log.info("Saving metric schema for $org_id/$dataset_id/$metric_name")
        if (!NamedMetricSchema.validateName(metric_name)) {
            throw IllegalArgumentException("Metric name must be alphanumeric plus _ and . characters")
        }
        schemaStore.storeMetric(
            org_id,
            dataset_id,
            metric_name.lowercase(),
            MetricSchema(config.label, config.column, config.builtinMetric, config.builtinMetric)
        )
        return Response()
    }

    @AuditableResponseBody
    @Operation(
        operationId = "PutEntitySchemaMetric",
        summary = "Save the schema of a single metric for a given dataset.",
        description = "Save the schema of a single metric for a given dataset. The metric will be given a name " +
            "based on the label in the schema, replacing any non-alphanumeric with _."
    )
    @Put(
        uri = "/{dataset_id}/schema/metric",
        consumes = [MediaType.APPLICATION_JSON]
    )
    @Deprecated("Use putNamedSchemaMetric instead")
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun putEntitySchemaMetric(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body config: MetricSchema,
    ): Response {
        val sanitizedName = NamedMetricSchema.nameFromLabel(config.label)
        log.info("Replacing metric schema for $org_id/$dataset_id/${config.label} with metric $sanitizedName")
        schemaStore.storeOrReplaceMetric(org_id, dataset_id, sanitizedName, config)
        return Response()
    }

    @Operation(
        operationId = "GetNamedMetricSchemas",
        summary = "Get all of the named metrics for a given dataset.",
        description = "Get all of the named metrics for a given dataset."
    )
    @Get(uri = "/{dataset_id}/schema/metrics", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole, WriteResourceRole)
    fun getEntitySchemaMetrics(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): List<NamedMetricSchema> {
        log.info("Getting the named metrics for $org_id/$dataset_id")
        return schemaStore.loadMetrics(org_id, dataset_id)
    }

    @Operation(
        operationId = "DeleteEntitySchemaMetric",
        summary = "Delete the schema of a single metric for a given dataset.",
        description = "Delete the schema of a single metric for a given dataset."
    )
    @Delete(uri = "/{dataset_id}/schema/metric/{metric_name}", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun deleteEntitySchemaMetric(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Schema(example = DocUtils.ExampleMetricName) metric_name: String,
    ): Response {
        log.info("Deleting metric schema for $org_id/$dataset_id/$metric_name")
        schemaStore.deleteMetric(org_id, dataset_id, metric_name)
        return Response()
    }

    @Operation(
        operationId = "AddResourceTag",
        summary = "Add a resource tag to a dataset",
        description = "Add a resource tag to a dataset"
    )
    @Post(uri = "/{dataset_id}/resource-tag", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun addResourceTag(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body body: ResourceTag,
    ): Response {
        dataService.datasetApi.writeResourceTag(
            ai.whylabs.dataservice.model.ResourceTag()
                .orgId(org_id)
                .resourceId(dataset_id)
                .key(body.key)
                .value(body.value)
        )
        return Response()
    }

    @Operation(
        operationId = "UpdateResourceTag",
        summary = "Update a resource tag to a dataset.",
        description = "Update a resource tag to a dataset."
    )
    @Put(uri = "/{dataset_id}/resource-tag", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun updateResourceTag(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body body: ResourceTag,
    ): Response {
        dataService.datasetApi.replaceResourceTag(
            ai.whylabs.dataservice.model.ResourceTag()
                .orgId(org_id)
                .resourceId(dataset_id)
                .key(body.key)
                .value(body.value)
        )
        return Response()
    }

    @Operation(
        operationId = "DeleteResourceTag",
        summary = "Delete a resource tag to a dataset.",
        description = "Delete a resource tag to a dataset."
    )
    @Delete(uri = "/{dataset_id}/resource-tag", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, WriteResourceRole)
    suspend fun deleteResourceTag(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
        @Body body: ResourceTag,
    ): Response {
        dataService.datasetApi.deleteResourceTag(org_id, dataset_id, body.key, body.value)
        return Response()
    }

    @Operation(
        operationId = "ListResourceTags",
        summary = "List resource tags for a dataset.",
        description = "List resource tags for a dataset."
    )
    @Get(uri = "/{dataset_id}/resource-tag/list", produces = [MediaType.APPLICATION_JSON])
    @Secured(AdministratorRole, UserRole, ReadResourceRole)
    suspend fun listResourceTags(
        @Schema(example = DocUtils.ExampleOrgId) org_id: String,
        @Schema(example = DocUtils.ExampleDatasetId) dataset_id: String,
    ): List<ResourceTag> {
        val tags = dataService.datasetApi.listResourceTags(org_id, dataset_id)
        return tags.map { ResourceTag(it.key, it.value) }
    }
}

data class RequestMonitorRunConfig(
    @Schema(description = "Request for Monitor Run")
    val orgId: String,
    val datasetId: String,
    val overwrite: Boolean,
    val analyzerIds: List<String>,
    val start: Long,
    val end: Long
)

data class ReinferEntitySchemaRequest(
    @Schema(description = "Request to reinfer entity schema")
    @field:Schema(example = DocUtils.ExampleInterval)
    val interval: String
)

data class ResourceTag(
    val key: String,
    val value: String
)

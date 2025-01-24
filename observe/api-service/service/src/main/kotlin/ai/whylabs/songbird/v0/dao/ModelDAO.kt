package ai.whylabs.songbird.v0.dao

import ai.whylabs.dataservice.model.Dataset
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataservice.DataServiceWrapper
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.v0.models.KeyValueTag
import ai.whylabs.songbird.v0.models.ModelCategory
import ai.whylabs.songbird.v0.models.ModelType
import ai.whylabs.songbird.v0.models.TimePeriod
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton

interface ModelDAO {
    fun listModels(orgId: String, includeInactive: Boolean): List<ModelMetadata>

    fun getModel(orgId: String, modelId: String): ModelMetadata

    fun saveModel(orgId: String, modelId: String, modelName: String, timePeriod: TimePeriod, modelType: ModelType?, expectExisting: Boolean): ModelMetadata

    fun markInactive(orgId: String, modelId: String): ModelMetadata

    fun incrementAndGetModelId(orgId: String): String
}

@Singleton
class ModelDAOImpl @Inject constructor(
    private val organizationDAO: OrganizationDAO,
    private val dataService: DataService,
) : ModelDAO, JsonLogging {

    override fun listModels(orgId: String, includeInactive: Boolean): List<ModelMetadata> {
        organizationDAO.checkExistence(orgId)
        log.debug("Using dataservice to list models in org {}", orgId)
        return DataServiceWrapper.tryCall {
            val datasets = dataService.datasetApi.listDatasets(orgId, includeInactive)
            datasets.map { ModelMetadata.fromDataServiceDataset(it) }
        }
    }

    override fun getModel(orgId: String, modelId: String): ModelMetadata {
        organizationDAO.checkExistence(orgId)
        log.debug("Using dataservice to get model {}/{}", orgId, modelId)
        try {
            return DataServiceWrapper.tryCall {
                val dataset = dataService.datasetApi.getDataset(orgId, modelId)
                val result = ModelMetadata.fromDataServiceDataset(dataset)
                if (result.active == false) {
                    throw ResourceNotFoundException("Model", modelId)
                }
                result
            }
        } catch (e: ResourceNotFoundException) {
            // Redo exception to maintain the same behavior as the DDB implementation
            throw ResourceNotFoundException("Model", modelId)
        }
    }

    override fun saveModel(
        orgId: String,
        modelId: String,
        modelName: String,
        timePeriod: TimePeriod,
        modelType: ModelType?,
        expectExisting: Boolean
    ): ModelMetadata {
        organizationDAO.checkExistence(orgId)
        val metadata = ModelMetadata(
            id = modelId,
            orgId = orgId,
            name = modelName,
            timePeriod = timePeriod,
            modelType = modelType,
            modelCategory = modelType?.category ?: ModelCategory.MODEL,
            creationTime = System.currentTimeMillis(),
            active = true,
        )
        dataService.datasetApi.writeDataset(metadata.toDataServiceDataset())
        log.info("Created or updated model: {}", metadata)
        return getModel(orgId, modelId) // make sure we get the correct creation timestamp and other created info
    }

    override fun markInactive(orgId: String, modelId: String): ModelMetadata {
        Dataset().orgId(orgId).datasetId(modelId).active(false)
        val dataset = getModel(orgId, modelId).copy(active = false)
        dataService.datasetApi.writeDataset(dataset.toDataServiceDataset())
        log.info("Marked model as inactive: {} - {}", orgId, modelId)
        return dataset
    }

    override fun incrementAndGetModelId(orgId: String): String {
        val models = listModels(orgId, includeInactive = true)
        val maxId = models.map { it.id.substringAfterLast('-').toIntOrNull() ?: 0 }.maxOrNull() ?: 0
        return "model-" + (maxId + 1).toString()
    }
}

@Schema(description = "Detailed metadata about a model", requiredProperties = ["id", "name"])
data class ModelMetadata(
    val id: String,
    val orgId: String,
    val name: String,
    val creationTime: Long?,
    val timePeriod: TimePeriod,
    val modelType: ModelType?,
    val modelCategory: ModelCategory,
    val active: Boolean?,
    val tags: List<KeyValueTag> = emptyList()
) {
    companion object {
        fun fromDataServiceDataset(dataset: Dataset): ModelMetadata {
            // type can be null even though it is supposedly non-null in API definition
            val modelType: ModelType? = dataset.type?.let { ModelType.valueOf(it) }
            return ModelMetadata(
                id = dataset.datasetId,
                orgId = dataset.orgId,
                name = dataset.name,
                creationTime = dataset.createdTs,
                timePeriod = TimePeriod.fromDataServiceGranularity(dataset.granularity),
                modelType = modelType,
                modelCategory = modelType?.category ?: ModelCategory.MODEL,
                active = dataset.active,
                tags = dataset.tags.map { KeyValueTag(it.key, it.value) }
            )
        }
    }
}

fun ModelMetadata.toDataServiceDataset(setCreatedTs: Boolean = false): Dataset {
    // let dataservice handle creation timestamp other than during migration
    // if active is null, dataservice should retain and return current value
    val dataset = Dataset().orgId(this.orgId).datasetId(this.id).name(this.name).granularity(this.timePeriod.toDataServiceGranularity())
        .type(this.modelType?.name).active(this.active)
    if (this.active == false) {
        // just do this for inactive models, don't assume all active models have ingestion enabled
        dataset.ingestionDisabled = true
    }
    if (setCreatedTs) {
        dataset.createdTs = this.creationTime ?: System.currentTimeMillis()
    }
    return dataset
}

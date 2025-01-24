package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.model.ColumnSchema
import ai.whylabs.songbird.client.model.EntitySchema
import ai.whylabs.songbird.client.model.SchemaMetadata
import ai.whylabs.songbird.client.model.MetricSchema
import ai.whylabs.songbird.client.model.ModelType
import ai.whylabs.songbird.client.model.SubscriptionTier
import ai.whylabs.songbird.client.model.TimePeriod
import ai.whylabs.songbird.util.DeleteFn
import ai.whylabs.songbird.util.expectClientFailure
import ai.whylabs.songbird.util.waitUntilCondition
import ai.whylabs.songbird.util.waitUntilCount
import ai.whylabs.songbird.util.withNewModel
import ai.whylabs.songbird.util.withNewOrg
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import java.util.UUID

const val HardcodedSandboxModel = "model-1"

class ModelsApiTest {
    private val client = SongbirdClients.ModelsApiClient

    private val mockColumnName = "columnA"
    private val mockColumnSchema = ColumnSchema("input", "fractional", "continuous")
    private val mockMetricSchema = MetricSchema("metricA", mockColumnName, builtinMetric = "median", defaultMetric = "median")
    private val mockEntitySchema = EntitySchema(
        columns = mapOf(mockColumnName to mockColumnSchema),
        metrics = mapOf(mockMetricSchema.label to mockMetricSchema),
        metadata = SchemaMetadata("author"),
    )

    // uploads the specified schema and returns it, along with the corresponding cleanup func
    private fun uploadSchema(
        orgId: String,
        datasetId: String,
        schema: EntitySchema,
    ): Pair<EntitySchema, DeleteFn> {
        client.putEntitySchema(orgId, datasetId, schema)
        waitUntilCount(1) { client.getEntitySchema(orgId, datasetId).let { 1 } }
        val uploadedSchema = client.getEntitySchema(orgId, datasetId)

        val delete: DeleteFn = {
            client.deleteEntitySchema(orgId, datasetId)
        }
        return Pair(uploadedSchema, delete)
    }

    // uploads the specified schema, cleans it up after running the validation function
    private fun withNewSchema(
        orgId: String,
        datasetId: String = HardcodedSandboxModel,
        schema: EntitySchema = mockEntitySchema,
        validateSchema: (uploadedSchema: EntitySchema) -> Unit
    ): EntitySchema {
        val (uploadedSchema, deleteSchema) = uploadSchema(orgId, datasetId, schema)
        try {
            validateSchema(uploadedSchema)
        } finally {
            deleteSchema()
        }

        return uploadedSchema
    }

    @Test
    fun `assert hardcoded sandbox model exists`() {
        val models = client.listModels(DemoSandboxOrg)
        val modelIds = models.items.map { it.id }.toList()
        assert(modelIds.contains(HardcodedSandboxModel)) { "Should contain sandbox model" }
    }

    @Test
    fun `model creation limited at 10`() {
        withNewOrg { org ->
            for (i in 1..10) {
                client.createModel(org.id, "model name", TimePeriod.P1D, ModelType.CLASSIFICATION, null)
            }

            // This one should fail
            expectClientFailure(400) {
                client.createModel(org.id, "model name", TimePeriod.P1D, ModelType.CLASSIFICATION, null)
            }
        }
    }

    @Test
    fun `model creation not limited at 10 for paid orgs`() {
        withNewOrg(tier = SubscriptionTier.PAID) { org ->
            for (i in 1..11) {
                client.createModel(org.id, "model name", TimePeriod.P1D, ModelType.CLASSIFICATION, null)
            }
        }
    }

    @Test
    fun `assert we can create model and segment`() {
        withNewOrg { org ->
            val modelName = "model-${UUID.randomUUID()}"
            val res = client.createModel(org.id, modelName, TimePeriod.P1D, null, null)
            val model = client.getModel(org.id, res.id)
            client.deactivateModel(org.id, model.id)
        }
    }

    @Test
    fun `deleted models don't count  towards limits`() {
        withNewOrg { org ->
            // Create and deactivate 10 models
            for (i in 1..10) {
                withNewModel(org.id) {}
            }

            // This one should not fail.
            withNewModel(org.id) {}
        }
    }

    @Test
    fun `entity schema can be saved, retrieved, and deleted`() {
        val datasetId = HardcodedSandboxModel
        withNewOrg { org ->
            withNewSchema(org.id, datasetId) {
                Assertions.assertEquals(mockEntitySchema.columns, it.columns)
                Assertions.assertEquals(mockEntitySchema.metrics, it.metrics)
            }

            // ensure schema was properly cleaned up by the base test case
            waitUntilCondition({
                client.getEntitySchema(org.id, datasetId).let { it.columns.isEmpty() && it.metrics?.isEmpty() == true }
            }, "Schema not deleted within allotted time.")
        }
    }

    @Test
    fun `metrics can be updated in the entity schema`() {
        withNewOrg { org ->
            withNewSchema(org.id) {
                val newMetric = MetricSchema("some-new-metric", "bar", builtinMetric = "max", defaultMetric = "max")
                client.putEntitySchemaMetric(org.id, HardcodedSandboxModel, newMetric)

                waitUntilCondition({
                    client.getEntitySchema(org.id, HardcodedSandboxModel).let {
                        it.metrics?.size == mockEntitySchema.metrics?.size?.plus(1)
                            && it.metrics?.get(newMetric.label)?.equals(newMetric) == true
                    }
                }, "Could not update schema with a new metric")
            }
        }
    }

    @Test
    fun `columns can be updated in the entity schema`() {
        withNewOrg { org ->
            withNewSchema(org.id) {
                val columnName = "some-new-column"
                val columnSchema = ColumnSchema("input", "bool", "discrete")
                client.putEntitySchemaColumn(org.id, HardcodedSandboxModel, columnName, columnSchema)

                waitUntilCondition({
                    client.getEntitySchema(org.id, HardcodedSandboxModel).let {
                        it.columns.size == mockEntitySchema.columns.size.plus(1)
                            && it.columns[columnName]?.equals(columnSchema) == true
                    }
                }, "Could not update schema with a new column")

                val updatedColumn = client.getEntitySchemaColumn(org.id, HardcodedSandboxModel, columnName)
                Assertions.assertEquals(columnSchema, updatedColumn)
            }
        }
    }
}

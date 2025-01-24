package ai.whylabs.songbird.schema

import ai.whylabs.dataservice.invoker.ApiException
import ai.whylabs.dataservice.model.GetEntitySchemaRequest
import ai.whylabs.dataservice.model.InferSchemaRequest
import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataservice.DataServiceWrapper
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.MonitorConfigUpdater
import com.amazonaws.services.s3.AmazonS3
import com.google.common.base.Suppliers
import com.google.common.collect.Sets
import jakarta.inject.Singleton
import java.io.BufferedReader
import java.util.concurrent.TimeUnit

@Singleton
class EntitySchemaStore(
    private val config: EnvironmentConfig,
    private val dataService: DataService,
    private val monitorConfigUpdater: MonitorConfigUpdater,
    private val s3: AmazonS3,
) : JsonLogging {
    private val cachedColumnDenyList = Suppliers.memoizeWithExpiration(this::loadColumnDenyList, 30, TimeUnit.MINUTES)
    private val denyListObject = "monitor-config-settings/entity-schema-deny-list.csv"

    private fun loadColumnDenyList(): Set<String> {
        try {
            val bucket = config.getEnv(EnvironmentVariable.StorageBucket)
            val denyListObj = s3.getObject(bucket, denyListObject)
            val inputStream = denyListObj.objectContent.delegateStream
            val reader = BufferedReader(inputStream.reader())
            val columnDenyList = mutableListOf<String>()
            reader.use { r ->
                var line = r.readLine()
                while (line != null) {
                    columnDenyList.add(line)
                    line = r.readLine()
                }
            }
            return columnDenyList.toSet()
        } catch (e: Exception) {
            log.error("Failed to load entity schema column deny list from s3", e)
            return emptySet()
        }
    }

    private fun columnDenyListKey(orgId: String, datasetId: String, columnId: String): String {
        return "$orgId,$datasetId,$columnId"
    }

    fun isInColumnDenyList(orgId: String, datasetId: String, columnId: String): Boolean {
        val denyListSet = cachedColumnDenyList.get()
        return denyListSet.contains(columnDenyListKey(orgId, datasetId, columnId))
    }

    private fun mergeNewColumns(existingSchema: EntitySchema, newSchema: EntitySchema): Map<String, ColumnSchema> {
        val existingColumns = existingSchema.columns.toMutableMap()
        val diff = Sets.difference(newSchema.columns.keys, existingColumns.keys)
        log.info("New columns to add to entity schema ${diff.joinToString(", ")}")

        listReplacementCandidates(existingSchema, newSchema).forEach { columnId ->
            existingColumns.remove(columnId)
        }
        return (existingColumns.asSequence() + newSchema.columns.asSequence())
            .distinct()
            .groupBy({ it.key }, { it.value })
            .mapValues { (_, values) -> values.first() }
    }

    private fun listReplacementCandidates(existingSchema: EntitySchema, newSchema: EntitySchema): Set<String> {
        val existingColumnsWithNullValues = existingSchema.columns.filter { it.value.dataType == "null" }.keys
        val newColumnsWithNonNullValues = newSchema.columns.filter { it.value.dataType != "null" }.keys
        return newColumnsWithNonNullValues.intersect(existingColumnsWithNullValues)
    }

    fun hasNewColumns(orgId: String, datasetId: String, schema: EntitySchema): Boolean {
        val existingSchema = load(orgId, datasetId) ?: return true

        if (listReplacementCandidates(existingSchema, schema).isNotEmpty()) {
            return true
        }
        val diff = Sets.difference(schema.columns.keys, existingSchema.columns.keys)
        return !diff.isEmpty()
    }

    fun storeEntitySchemaRecordUpdate(orgId: String, datasetId: String, newSchema: EntitySchema) {
        val existingSchema = load(orgId, datasetId) ?: return store(orgId, datasetId, newSchema)
        val replacementCandidates = listReplacementCandidates(existingSchema, newSchema)
        val newColumns = newSchema.columns.filter { it.key in replacementCandidates }
        dataService.entitySchemaApi.appendEntitySchema(orgId, datasetId, existingSchema.copy(columns = newColumns).toDataServiceEntitySchema())
    }

    fun reinfer(orgId: String, datasetId: String, interval: String): EntitySchema {
        val existingSchema = load(orgId, datasetId) ?: EntitySchema(emptyMap())
        val inferredSchema = DataServiceWrapper.tryCall {
            dataService.profileApi.inferEntitySchema(
                InferSchemaRequest().orgId(orgId).datasetId(datasetId).interval(interval)
            )
        }
        // keep existing columns and update them with type/discreteness from inferred schema, where available
        val updatedColumns = existingSchema.columns.toMutableMap()
        inferredSchema.columns.forEach { (columnId, columnSchema) ->
            val existingColumn = existingSchema.columns[columnId]
            val inferredColumn = ColumnSchema.fromDataServiceSchema(columnSchema)
            val updatedColumn = ColumnSchema(
                classifier = existingColumn?.classifier,
                dataType = inferredColumn.dataType,
                discreteness = inferredColumn.discreteness,
                tags = existingColumn?.tags
            ).repair()
            ColumnSchema.validate(updatedColumn, columnId)
            updatedColumns[columnId] = updatedColumn
        }
        val updatedSchema = existingSchema.copy(columns = updatedColumns)
        store(orgId, datasetId, updatedSchema)
        return updatedSchema
    }

    fun storeColumn(orgId: String, datasetId: String, columnId: String, column: ColumnSchema) {
        val schema = load(orgId, datasetId) ?: EntitySchema(columns = emptyMap())
        val columns = schema.columns.toMutableMap()

        val originalColumn = columns[columnId]
        val mergedColumn = ColumnSchema(
            classifier = column.classifier ?: originalColumn?.classifier,
            dataType = column.dataType ?: originalColumn?.dataType,
            discreteness = column.discreteness ?: originalColumn?.discreteness,
            tags = column.tags ?: originalColumn?.tags
        ).repair()
        ColumnSchema.validate(mergedColumn, columnId)
        columns[columnId] = mergedColumn

        dataService.entitySchemaApi.writeColumnSchema(orgId, datasetId, columnId, mergedColumn.toDataServiceColumnSchema())
        store(orgId, datasetId, schema.copy(columns = columns), false)
    }

    fun store(orgId: String, datasetId: String, entitySchema: EntitySchema, dsOverwrite: Boolean = true) {
        val repairedSchema = entitySchema.repair()
        EntitySchema.validate(repairedSchema)

        log.info("Entity Schema store $orgId/$datasetId to data service")
        if (dsOverwrite) {
            dataService.entitySchemaApi.overwriteSchema(orgId, datasetId, repairedSchema.toDataServiceEntitySchema())
        }
        // When postgres is authoritative for schema and monitor config, should songbird stop doing this?
        monitorConfigUpdater.scheduleMonitorConfigUpdate(orgId, datasetId)
    }

    fun delete(orgId: String, datasetId: String) {
        log.info("Entity Schema delete $orgId/$datasetId")

        // delete by overwriting with an empty schema
        dataService.entitySchemaApi.overwriteSchema(orgId, datasetId, ai.whylabs.dataservice.model.EntitySchema())
        monitorConfigUpdater.scheduleMonitorConfigUpdate(orgId, datasetId)
    }

    fun load(orgId: String, datasetId: String, useCached: Boolean = false): EntitySchema? {
        val request = GetEntitySchemaRequest()
        request.orgId = orgId
        request.datasetId = datasetId
        request.includeHidden = true
        request.eventuallyConsistent = useCached
        try {
            val schema = dataService.entitySchemaApi.getEntitySchema(request)
            return EntitySchema.fromDataServiceSchema(schema)
        } catch (e: ApiException) {
            if (e.code == 404) {
                return null
            }
            throw e
        }
    }

    fun loadColumn(orgId: String, datasetId: String, columnId: String): ColumnSchema {
        val schema = DataServiceWrapper.tryCall { dataService.entitySchemaApi.getColumnSchema(orgId, datasetId, columnId) }
        return ColumnSchema.fromDataServiceSchema(schema)
    }

    fun deleteColumn(orgId: String, datasetId: String, columnId: String) {
        val schema = load(orgId, datasetId) ?: return
        val columns = schema.columns.toMutableMap()
        columns.remove(columnId)
        dataService.entitySchemaApi.deleteColumnSchema(orgId, datasetId, columnId)
    }

    fun loadMetrics(orgId: String, datasetId: String): List<NamedMetricSchema> {
        val metrics = DataServiceWrapper.tryCall { dataService.entitySchemaApi.getCustomMetricsSchema(orgId, datasetId) }
        return metrics.map { NamedMetricSchema.fromDataServiceSchema(it.key, it.value) }
    }

    fun storeMetric(orgId: String, datasetId: String, name: String, metricSchema: MetricSchema) {
        dataService.entitySchemaApi.writeMetricSchema(orgId, datasetId, name, metricSchema.toDataServiceMetricSchema())
    }

    fun storeOrReplaceMetric(orgId: String, datasetId: String, name: String, metricSchema: MetricSchema) {
        DataServiceWrapper.tryCall {
            dataService.entitySchemaApi.writeMetricSchema(
                orgId,
                datasetId,
                name,
                metricSchema.toDataServiceMetricSchema()
            )
        }
    }

    fun deleteMetric(orgId: String, datasetId: String, name: String) {
        val schema = load(orgId, datasetId) ?: return
        val metrics = schema.metrics ?: emptyMap()
        dataService.entitySchemaApi.deleteCustomMetricSchema(orgId, datasetId, name)
        store(orgId, datasetId, schema.copy(metrics = metrics.minus(name)), false)
    }
}

fun EntitySchema.repair(): EntitySchema {
    val convertedColumns = columns.mapValues { (_, columnSchema) ->
        columnSchema.repair()
    }
    return this.copy(columns = convertedColumns)
}

fun ColumnSchema.repair(): ColumnSchema {
    return if (dataType == "integer") {
        this.copy(dataType = "integral")
    } else {
        this
    }
}

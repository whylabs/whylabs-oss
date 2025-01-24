package ai.whylabs.songbird.schema

import ai.whylabs.dataservice.model.Classifier
import ai.whylabs.dataservice.model.CustomMetricSchema
import ai.whylabs.dataservice.model.DataType
import ai.whylabs.dataservice.model.DiscretenessType
import ai.whylabs.songbird.logging.JsonLogging
import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "Entity schema for a dataset", requiredProperties = ["columns"])
data class EntitySchema(
    @field:Schema(
        description = "Column schema for a given column"
    )
    val columns: Map<String, ColumnSchema>,
    val metadata: SchemaMetadata = SchemaMetadata(),
    @field:Schema(
        description = "Schema for user-defined metrics (map of unique custom metric labels to their definitions)",
        required = false
    )
    val metrics: Map<String, MetricSchema>? = emptyMap()
) {

    internal fun toDataServiceEntitySchema(): ai.whylabs.dataservice.model.EntitySchema {
        val entitySchema = ai.whylabs.dataservice.model.EntitySchema()
        entitySchema.columns = columns.mapValues { it.value.toDataServiceColumnSchema() }
        entitySchema.metadata = metadata.toDataServiceSchemaMetadata()
        entitySchema.customMetrics = metrics?.entries?.associate { it.key to it.value.toDataServiceMetricSchema() } ?: emptyMap()
        return entitySchema
    }

    internal fun toIndexedEntitySchema(): IndexedEntitySchema {
        return IndexedEntitySchema(
            columns.map {
                ColumnSchema.validate(it.value, it.key)
                IndexedColumnSchema(it.key, it.value.classifier!!, it.value.dataType ?: "null", it.value.discreteness!!, it.value.tags)
            },
            metrics?.map {
                MetricSchema.validate(it.value, it.key)
                // Either default metric or builtin metric should be present
                IndexedMetricSchema(it.key, it.value.label, it.value.column, it.value.builtinMetric ?: it.value.defaultMetric ?: "")
            } ?: emptyList(),
        )
    }

    companion object {
        fun fromDataServiceSchema(dsEntitySchema: ai.whylabs.dataservice.model.EntitySchema): EntitySchema {
            val columns = dsEntitySchema.columns.mapValues { ColumnSchema.fromDataServiceSchema(it.value) }
            val metrics = dsEntitySchema.customMetrics?.mapValues { MetricSchema.fromDataServiceSchema(it.value) } ?: emptyMap()
            val metadata = SchemaMetadata.fromDataServiceSchemaMetadata(dsEntitySchema.metadata)
            return EntitySchema(columns, metadata, metrics)
        }

        fun validate(schema: EntitySchema) {
            val errors = mutableListOf<String>()
            schema.columns.forEach { (name, column) ->
                val columnErrors = ColumnSchema.validationErrors(column)
                if (columnErrors.isNotEmpty()) {
                    errors.add("Column $name has the following errors: ${columnErrors.joinToString(", ")}")
                }
            }
            if (errors.isNotEmpty()) {
                throw IllegalArgumentException(errors.joinToString(separator = "\n"))
            }
        }
    }
}

@Schema(
    description = "Metadata for entity schema information"
)
data class SchemaMetadata(
    @field:Schema(description = "Version of the entity schema", example = "1")
    val version: Long = 0,
    @field:Schema(description = "Update timestamp in milliseconds", example = "1234567890123")
    val updatedTimestamp: Long = System.currentTimeMillis(),
    @field:Schema(description = "Author of the entity schema version", example = "user")
    val author: String = "system"
) {
    internal fun toDataServiceSchemaMetadata(): ai.whylabs.dataservice.model.Metadata {
        val metadata = ai.whylabs.dataservice.model.Metadata()
        metadata.version = this.version.toInt()
        metadata.schemaVersion = 1
        metadata.updatedTimestamp = this.updatedTimestamp
        metadata.author = this.author
        return metadata
    }

    companion object {
        internal fun fromDataServiceSchemaMetadata(dsMetadata: ai.whylabs.dataservice.model.Metadata): SchemaMetadata {
            // author can be missing in older records, despite the dataservice type being non-nullable
            val author: String? = dsMetadata.author
            return SchemaMetadata(
                dsMetadata.version.toLong(), dsMetadata.updatedTimestamp, author ?: "system"
            )
        }
    }
}

@Schema(description = "Column schema for a given column", requiredProperties = ["classifier", "dataType", "discreteness"])
data class ColumnSchema(
    @field:Schema(
        description = "We can classify these columns into various grouping. Currently we only support 'input' and 'output'",
        example = "input"
    )
    val classifier: String?,
    @field:Schema(
        description = "The data type of the columns. Setting this field affects the default grouping (i.e integral columns)",
        example = "fractional"
    )
    val dataType: String?,
    @field:Schema(
        description = "Whether a column should be discrete or continuous. Changing this column will change the default grouping (discrete columns vs. continuous columns",
        example = "discrete"
    )
    val discreteness: String?,
    @field:Schema(
        description = "Metadata tags for the column schema information",
    )
    val tags: List<String>?
) {
    internal fun toDataServiceColumnSchema(): ai.whylabs.dataservice.model.ColumnSchema {
        val columnSchema = ai.whylabs.dataservice.model.ColumnSchema()
        columnSchema.discreteness = if (this.discreteness.equals("continuous", ignoreCase = true)) {
            DiscretenessType.CONTINUOUS
        } else {
            DiscretenessType.DISCRETE
        }
        columnSchema.dataType = when (this.dataType?.lowercase()) {
            "bool" -> DataType.BOOLEAN
            "boolean" -> DataType.BOOLEAN
            "fractional" -> DataType.FRACTIONAL
            "integral" -> DataType.INTEGRAL
            "null" -> DataType.NULL
            "unknown" -> DataType.UNKNOWN
            "string" -> DataType.STRING
            else -> DataType.NULL
        }
        columnSchema.classifier = when (this.classifier?.lowercase()) {
            "input" -> Classifier.INPUT
            "output" -> Classifier.OUTPUT
            else -> Classifier.INPUT
        }
        columnSchema.tags = this.tags ?: emptyList()
        return columnSchema
    }

    companion object : JsonLogging {
        fun fromIndexedColumnSchema(indexedColumnSchema: IndexedColumnSchema): ColumnSchema {
            val dataType = if (indexedColumnSchema.dataType.equals("boolean", ignoreCase = true)) {
                "bool"
            } else {
                indexedColumnSchema.dataType
            }
            return ColumnSchema(indexedColumnSchema.classifier, dataType, indexedColumnSchema.discreteness, indexedColumnSchema.tags)
        }

        fun fromDataServiceSchema(dsColumnSchema: ai.whylabs.dataservice.model.ColumnSchema): ColumnSchema {
            val discreteness = dsColumnSchema.discreteness.toString().lowercase()
            // TODO fix this in data service and ensure we use bool everywhere!
            val dataType = if (
                dsColumnSchema.dataType.toString().lowercase() == "boolean"
            ) {
                "bool"
            } else dsColumnSchema.dataType.toString().lowercase()
            val classifier = dsColumnSchema.classifier.toString().lowercase()
            val tags = dsColumnSchema.tags
            return ColumnSchema(classifier, dataType, discreteness, tags)
        }

        fun validationErrors(column: ColumnSchema): List<String> {
            val errors = mutableListOf<String>()
            if (column.classifier == null) {
                errors.add("Missing required column schema field 'classifier'")
            } else {
                if (!Classifier.values().map { it.name.lowercase() }.contains(column.classifier.lowercase())) {
                    errors.add("Invalid classifier value ${column.classifier}")
                }
            }
            if (column.discreteness == null) {
                errors.add("Missing required column schema field 'discreteness'")
            } else {
                if (!DiscretenessType.values().map { it.name.lowercase() }.contains(column.discreteness.lowercase())) {
                    errors.add("Invalid discreteness value '${column.discreteness}'")
                }
            }
            if (column.dataType != null && !ColumnDataType.values().map { it.name.lowercase() }.contains(column.dataType.lowercase())) {
                errors.add("Invalid data type '${column.dataType}'")
            }
            return errors
        }

        fun validate(column: ColumnSchema, name: String) {
            val errors = validationErrors(column)
            if (errors.isNotEmpty()) {
                throw IllegalArgumentException("Column $name has the following errors: ${errors.joinToString(", ")}")
            }
        }
    }
}

@Schema(description = "Schema for user-defined metrics", requiredProperties = ["label", "column"])
data class MetricSchema(
    @field:Schema(
        description = "User-friendly label for the metric.",
        example = "Estimated prediction median"
    )
    val label: String,
    @field:Schema(
        description = "Entity column to extract the metric from",
        example = "estimated_prediction"
    )
    val column: String,
    @Deprecated(message = "Please use builtinMetric instead")
    val defaultMetric: String?,
    @field:Schema(
        description = "The built-in profile metric to extract when this schema is applied. Should match the values of the SimpleColumnMetric enum within the monitor config schema.",
        example = "median"
    )
    val builtinMetric: String?,
) {
    companion object {
        fun fromIndexedMetricSchema(indexedMetricSchema: IndexedMetricSchema): MetricSchema {
            return MetricSchema(indexedMetricSchema.label, indexedMetricSchema.column, indexedMetricSchema.defaultMetric, indexedMetricSchema.defaultMetric)
        }

        fun fromDataServiceSchema(dsMetricSchema: CustomMetricSchema): MetricSchema {
            return MetricSchema(dsMetricSchema.label, dsMetricSchema.column, dsMetricSchema.builtinMetric, dsMetricSchema.builtinMetric)
        }

        fun validationErrors(metric: MetricSchema): List<String> {
            val errors = mutableListOf<String>()
            if (metric.builtinMetric == null && metric.defaultMetric == null) {
                errors.add("builtinMetric or defaultMetric (deprecated) must be specified")
            }
            return errors
        }

        fun validate(metric: MetricSchema, name: String) {
            val errors = MetricSchema.validationErrors(metric)
            if (errors.isNotEmpty()) {
                throw IllegalArgumentException("Metric $name has the following errors: ${errors.joinToString(", ")}")
            }
        }
    }

    internal fun toDataServiceMetricSchema(): CustomMetricSchema {
        return CustomMetricSchema().label(this.label).column(this.column).builtinMetric(this.builtinMetric ?: this.defaultMetric)
    }
}

data class MetricSchemaFields(
    @field:Schema(
        description = "User-friendly label for the metric.",
        example = "Estimated prediction median"
    )
    val label: String,
    @field:Schema(
        description = "Entity column to extract the metric from",
        example = "estimated_prediction"
    )
    val column: String,
    @field:Schema(
        description = "WhyLabs built-in profile metric to use for this metric. Note that other metrics may be available for this column as well, this is the one to be used in the named metric. Should match the values of the SimpleColumnMetric enum within the monitor config schema.",
        example = "median"
    )
    val builtinMetric: String
)

data class NamedMetricSchema(
    @field:Schema(
        description = "A name for the metric. This should be a unique across the metrics for the dataset and consist of alphanumeric plus _ characters.",
        example = "estimated_prediction_name"
    )
    val name: String,
    @field:Schema(
        description = "User-friendly label for the metric.",
        example = "Estimated prediction median"
    )
    val label: String,
    @field:Schema(
        description = "Entity column to extract the metric from",
        example = "estimated_prediction"
    )
    val column: String,
    @field:Schema(
        description = "WhyLabs built-in profile metric to use for this named metric. Note that other metrics may be available for this column as well, this is the one to be used in the named metric. Should match the values of the SimpleColumnMetric enum within the monitor config schema.",
        example = "median"
    )
    val builtinMetric: String
) {
    companion object {
        fun fromIndexedMetricSchema(name: String, metricSchema: MetricSchema): NamedMetricSchema {
            // Either defaultMetric or builtinMetric should be present
            return NamedMetricSchema(name, metricSchema.label, metricSchema.column, metricSchema.builtinMetric ?: metricSchema.defaultMetric ?: "")
        }

        fun fromDataServiceSchema(name: String, dsMetricSchema: CustomMetricSchema): NamedMetricSchema {
            return NamedMetricSchema(name, dsMetricSchema.label, dsMetricSchema.column, dsMetricSchema.builtinMetric)
        }

        fun validateName(name: String): Boolean {
            return name.matches(Regex("^[a-zA-Z0-9_.]+$"))
        }

        fun nameFromLabel(label: String): String {
            return label.lowercase().replace(Regex("[^a-zA-Z0-9_.]"), "_")
        }
    }
}

interface IndexedDocument

data class IndexedEntitySchemaDocument(val orgId: String, val datasetId: String, val entitySchema: IndexedEntitySchema, val timestamp: Long = System.currentTimeMillis()) : IndexedDocument

data class IndexedEntitySchema(val columns: List<IndexedColumnSchema>, val metrics: List<IndexedMetricSchema>?) {
    internal fun toEntitySchema(metadata: SchemaMetadata = SchemaMetadata()): EntitySchema {
        return EntitySchema(
            columns.associate { it.column to ColumnSchema.fromIndexedColumnSchema(it) },
            metadata,
            metrics?.associate {
                val sanitizedName = it.name ?: NamedMetricSchema.nameFromLabel(it.label)
                sanitizedName to MetricSchema.fromIndexedMetricSchema(it)
            }
        )
    }
}
data class IndexedColumnSchema(val column: String, val classifier: String, val dataType: String, val discreteness: String, val tags: List<String>?)

data class IndexedMetricSchema(
    val name: String?, // should exist but may not in older records
    val label: String,
    val column: String,
    // This should ideally only support values of SimpleColumnMetric from the monitor config schema
    val defaultMetric: String
)

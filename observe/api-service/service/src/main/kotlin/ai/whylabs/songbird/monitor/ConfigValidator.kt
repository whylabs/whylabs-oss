package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.common.SchemaRulesChecker
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.validator.AnalyzerDoesNotHaveConfigValidator
import ai.whylabs.songbird.monitor.validator.ChainMonitorConfigValidator
import ai.whylabs.songbird.monitor.validator.ColumnTargetIncludeValidator
import ai.whylabs.songbird.monitor.validator.CompositeAnalyzerValidator
import ai.whylabs.songbird.monitor.validator.DisableTargetRollupValidator
import ai.whylabs.songbird.monitor.validator.DuplicateIdOrDisplayNameValidator
import ai.whylabs.songbird.monitor.validator.GlobalActionValidator
import ai.whylabs.songbird.monitor.validator.MinMaxThresholdValidator
import ai.whylabs.songbird.monitor.validator.MonitorOffsetValidator
import ai.whylabs.songbird.monitor.validator.MonitorToAnalyzerUniquenessValidator
import ai.whylabs.songbird.monitor.validator.MonotonicAnalyzerValidator
import ai.whylabs.songbird.monitor.validator.MultiAnalyzerMonitorsValidator
import ai.whylabs.songbird.monitor.validator.TargetMatrixIncludeExcludeListValidator
import ai.whylabs.songbird.monitor.validator.TargetMatrixValidator
import ai.whylabs.songbird.monitor.validator.UnsupportedMetricsAndTypesValidator
import ai.whylabs.songbird.monitor.validator.ValidatorResult
import ai.whylabs.songbird.v0.dao.NotificationActionDAO
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.Configuration
import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import com.jayway.jsonpath.Option
import io.micrometer.core.instrument.MeterRegistry
import jakarta.inject.Inject
import jakarta.inject.Singleton
import net.pwall.json.pointer.JSONPointer
import net.pwall.json.schema.JSONSchema

@Singleton
class ConfigValidator @Inject constructor(
    schemaResolver: SchemaResolver,
    private val dataService: DataService,
    private val notificationActionDAO: NotificationActionDAO,
    private val meterRegistry: MeterRegistry
) : JsonLogging {
    val schema: JSONSchema = schemaResolver.resolveSchema()

    private fun checkValidationRules(config: DocumentContext) {
        val validatorResult = ChainMonitorConfigValidator(
            AnalyzerDoesNotHaveConfigValidator(),
            MinMaxThresholdValidator(),
            DisableTargetRollupValidator(dataService),
            MultiAnalyzerMonitorsValidator(),
            DuplicateIdOrDisplayNameValidator(),
            GlobalActionValidator(notificationActionDAO),
            UnsupportedMetricsAndTypesValidator(),
            CompositeAnalyzerValidator(),
            MonitorToAnalyzerUniquenessValidator(),
            TargetMatrixIncludeExcludeListValidator(),
            TargetMatrixValidator(),
            ColumnTargetIncludeValidator(),
            MonotonicAnalyzerValidator(),
            MonitorOffsetValidator(),
        ).validation(config)
        if (validatorResult is ValidatorResult.Error) {
            throw MonitorConfigValidationException(validatorResult.message)
        } else {
            if (validatorResult is ValidatorResult.Warning) {
                val orgId = config.read<String>("$.orgId")
                val datasetId = config.read<String>("$.datasetId")
                val message = validatorResult.message
                log.warn("Failed validation for $orgId and $datasetId with message: $message")
            }
        }
    }

    private fun checkSchemaRules(config: String, verbose: Boolean = false) {
        val errMsg = SchemaRulesChecker(schema).checkSchemaRules(config, verbose)
        if (errMsg != null) {
            meterRegistry.counter("MonitorConfig.ValidationError.SchemaValidation").increment()
            throw SchemaValidationException(
                "Monitor schema errors found. See https://whylabs.github.io/monitor-schema/ for schema documentation. $errMsg"
            )
        }
    }

    private fun checkOrgAndDatasetId(config: DocumentContext, orgId: String, datasetId: String) {
        val validIds = config.read<String>("$.orgId") == orgId && config.read<String>("$.datasetId") == datasetId

        if (!validIds) {
            meterRegistry.counter("MonitorConfig.ValidationError.OrgOrDatasetMismatch").increment()
            throw MonitorConfigValidationException("Invalid org or dataset id in configuration.")
        }
    }

    private fun checkReservedTags(config: DocumentContext) {
        val matches = config.read<List<Map<String, String>>>("$.analyzers[?('${MonitorConfig.TAG_CONSTRAINTS}' in @.tags)]")
        val pass = matches.all { analyzer ->
            val analyzerConfig = JsonPath.parse(jacksonObjectMapper().writeValueAsString(analyzer))
            val type = analyzerConfig.read<String>("$.config.type")
            type in MonitorConfig.SUPPORTED_TYPES_CONSTRAINTS
        }
        if (!pass) {
            throw MonitorConfigValidationException("Invalid constraint configuration.")
        }
    }

    fun validateConfig(config: String, orgId: String, datasetId: String, verbose: Boolean = false, includeEntitySchema: Boolean = false, includeWeightConfig: Boolean = false) {
        val configuration = Configuration.defaultConfiguration()
            .addOptions(Option.SUPPRESS_EXCEPTIONS)
        val configDocumentContext = JsonPath.parse(config, configuration)
        if (!includeEntitySchema) {
            configDocumentContext.delete("$.entitySchema")
        }
        if (!includeWeightConfig) {
            configDocumentContext.delete("$.weightConfig")
        }
        checkSchemaRules(configDocumentContext.jsonString(), verbose = verbose)
        checkOrgAndDatasetId(configDocumentContext, orgId, datasetId)
        checkReservedTags(configDocumentContext)
        checkValidationRules(configDocumentContext)
    }

    fun validateEntitySchema(entity: String, verbose: Boolean = false) {
        val errMsg = SchemaRulesChecker(schema).checkSchemaRules(entity, schema.childLocation(JSONPointer("/definitions/EntitySchema")), verbose = verbose)
        if (errMsg != null) {
            throw SchemaValidationException(
                "Entity schema errors found. See https://whylabs.github.io/monitor-schema/ for schema documentation. $errMsg"
            )
        }
    }

    fun validateColumnSchema(column: String, verbose: Boolean = false) {
        val errMsg = SchemaRulesChecker(schema).checkSchemaRules(column, JSONPointer("/definitions/ColumnSchema"), verbose = verbose)
        if (errMsg != null) {
            throw SchemaValidationException(
                "Column schema errors found. See https://whylabs.github.io/monitor-schema/ for schema documentation. $errMsg"
            )
        }
    }

    fun preventChangesToSystemComponents(newConfig: String, originalConfig: String) {
        val configuration = Configuration.defaultConfiguration()
            .addOptions(Option.SUPPRESS_EXCEPTIONS)
        val updated = JsonPath.parse(newConfig, configuration)
        val original = JsonPath.parse(originalConfig, configuration)
        val newMetadata = updated.read<Map<String, String>>("$.metadata")
        val origMetadata = original.read<Map<String, String>>("$.metadata")

        if ((newMetadata == null && origMetadata != null) || (newMetadata != null && origMetadata == null)) {
            throw MonitorConfigValidationException("Config metadata cannot be added or removed.")
        }
        if (newMetadata != null) {
            if (newMetadata.toString() != origMetadata.toString()) {
                throw MonitorConfigValidationException("Changes not permitted to config metadata.")
            }
        }
    }
}

class SchemaValidationException(s: String) : RuntimeException(s)

class MonitorConfigValidationException(s: String) : RuntimeException(s)

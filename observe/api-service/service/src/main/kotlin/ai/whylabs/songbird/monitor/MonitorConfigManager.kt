package ai.whylabs.songbird.monitor

import ai.whylabs.dataservice.model.MonitorConfigV3Row
import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.dataservice.DataServiceWrapper
import ai.whylabs.songbird.dataset.DatasetProfileManager
import ai.whylabs.songbird.feature.EntityWeightRecord
import ai.whylabs.songbird.feature.FeatureWeightStore
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.notification.NotificationActionHandler
import ai.whylabs.songbird.operations.FeatureFlagClient
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.schema.EntitySchema
import ai.whylabs.songbird.schema.EntitySchemaStore
import ai.whylabs.songbird.util.DownloadType
import ai.whylabs.songbird.util.LocalResource
import ai.whylabs.songbird.util.S3DownloadParams
import ai.whylabs.songbird.v0.dao.ModelDAO
import ai.whylabs.songbird.v0.ddb.NotificationRelationshipItem
import ai.whylabs.songbird.v0.ddb.NotificationRelationshipType
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.iterable.S3Objects
import com.amazonaws.services.s3.model.S3ObjectSummary
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.Configuration
import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import com.jayway.jsonpath.Option
import io.micrometer.core.instrument.MeterRegistry
import jakarta.inject.Inject
import jakarta.inject.Singleton
import net.pwall.json.JSON

@Singleton
class MonitorConfigManager @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val featureFlagClient: FeatureFlagClient,
    private val datasetProfileManager: DatasetProfileManager,
    private val configValidator: ConfigValidator,
    private val entitySchemaStore: EntitySchemaStore,
    private val featureWeightStore: FeatureWeightStore,
    private val dataService: DataService,
    private val monitorConfigUpdater: MonitorConfigUpdater,
    private val notificationActionHandler: NotificationActionHandler,
    private val modelDAO: ModelDAO,
    private val s3: AmazonS3,
    private val meterRegistry: MeterRegistry
) : JsonLogging {
    private val jsonPathConfig = Configuration.defaultConfiguration()
        .addOptions(Option.SUPPRESS_EXCEPTIONS)
    private val objectMapper = jacksonObjectMapper()
    private val baseConfig = LocalResource.MonitorConfigBase.asString()

    private fun configPrefix(orgId: String, entityId: String): String {
        return String.format("%s_%s", orgId, entityId)
    }

    fun listAll(bucketName: String? = null, s3Client: AmazonS3 = s3): Map<MonitorConfigFileMetadata, List<S3ObjectSummary>> {
        val bucket = bucketName ?: environmentConfig.getEnv(EnvironmentVariable.StorageBucket)
        val summaries = S3Objects.withPrefix(s3Client, bucket, DownloadType.MonitorConfig.prefix + "/")
            .filter { it.size != 0L }
            .sortedBy { it.lastModified.time }

        return summaries.groupBy {
            val filename = it.key.split("/").last()
            val parts = filename.split("_")
            MonitorConfigFileMetadata(parts[0], parts[1])
        }
    }

    private fun loadFromS3(orgId: String, datasetId: String): String {
        log.info("Loading monitor config for $orgId/$datasetId")
        val bucket = environmentConfig.getEnv(EnvironmentVariable.StorageBucket)

        val prefix = DownloadType.MonitorConfig.prefix + "/$orgId/$datasetId/"
        val summaries = S3Objects.withPrefix(s3, bucket, prefix).filter {
            it.key
                .split("/")
                .last()
                .startsWith(configPrefix(orgId, datasetId))
        }.sortedBy { it.lastModified.time }

        if (summaries.isNotEmpty()) {
            val latest = summaries.last()
            val downloadParams = S3DownloadParams(
                bucket = bucket,
                key = latest.key,
                downloadType = DownloadType.MonitorConfig,
                logger = log,
            )
            return downloadParams.download(s3)
        }

        return generateDefaultBaseConfig(orgId, datasetId).asJson()
    }

    private fun loadFromDataService(orgId: String, datasetId: String): String? {
        return try {
            val row = DataServiceWrapper.tryCall { dataService.monitorConfigApi.getLatest(orgId, datasetId) }
            row?.jsonConf
        } catch (e: ResourceNotFoundException) {
            null
        }
    }

    private fun loadConfig(orgId: String, datasetId: String): String {
        val dataServiceConfig = loadFromDataService(orgId, datasetId)
        return if (dataServiceConfig != null) {
            dataServiceConfig
        } else {
            val backupConfig = loadFromS3(orgId, datasetId)
            val backupConfigDocument = JsonPath.parse(backupConfig, jsonPathConfig)
            backupConfigDocument.delete("$.metadata")
            backupConfigDocument.jsonString()
        }
    }

    fun loadMonitorConfigBuilder(orgId: String, datasetId: String, includeEntitySchema: Boolean = false, includeEntityWeights: Boolean = false): MonitorConfig.Builder {
        val config = JsonPath.parse(loadConfig(orgId, datasetId), jsonPathConfig)
        // ensure entity schema and weight config information only come from the store
        config.delete("$.entitySchema")
        config.delete("$.weightConfig")
        if (includeEntitySchema) {
            val entitySchema = entitySchemaStore.load(orgId, datasetId) ?: EntitySchema(emptyMap())
            config.put("$", "entitySchema", entitySchema)
        }
        if (includeEntityWeights) {
            val weightConfig = featureWeightStore.load(orgId, datasetId) ?: EntityWeightRecord(emptyList())
            config.put("$", "weightConfig", weightConfig)
        }

        return MonitorConfig.Builder(orgId, datasetId, config)
    }

    fun load(orgId: String, datasetId: String, includeEntitySchema: Boolean = false, includeEntityWeights: Boolean = false): MonitorConfig {
        val configBuilder = loadMonitorConfigBuilder(orgId, datasetId, includeEntitySchema, includeEntityWeights)
        val monitorConfig = configBuilder.build()

        try {
            configValidator.validateConfig(monitorConfig.minimal, orgId, datasetId)
        } catch (e: Exception) {
            meterRegistry.counter("MonitorConfig.ValidationError.ExistingConfig").increment()
            log.warn(
                "Loading monitor config from storage which does not pass validation ($orgId / $datasetId). " +
                    "This may happen if new validation rules are added which previously saved monitor config does not satisfy."
            )
        }

        return monitorConfig
    }

    private fun generateDefaultBaseConfig(orgId: String, datasetId: String): MonitorConfig {
        val document = JsonPath.parse(baseConfig, jsonPathConfig)
        return MonitorConfig.Builder(orgId, datasetId, document)
            .addConfigProperties()
            .addGranularity(modelDAO.getModel(orgId, datasetId).timePeriod)
            .build()
    }

    fun loadAnalyzer(orgId: String, datasetId: String, analyzerId: String): String? {
        val config = JsonPath.parse(load(orgId, datasetId).asJson())
        val matches = config.read<List<Map<String, String>>>("$.analyzers[?(@.id == \"$analyzerId\")]")

        if (matches.isEmpty()) {
            return null
        }
        return objectMapper.writeValueAsString(matches.first())
    }

    fun loadMonitor(orgId: String, datasetId: String, monitorId: String): String? {
        val config = JsonPath.parse(load(orgId, datasetId).asJson())
        val matches = config.read<List<Map<String, String>>>("$.monitors[?(@.id == \"$monitorId\")]")

        if (matches.isEmpty()) {
            return null
        }
        return objectMapper.writeValueAsString(matches.first())
    }

    private fun resolveConstraintDefinition(analyzerId: String, config: DocumentContext, depth: Int = 0): String? {
        if (depth > 1) {
            return null
        }
        try {
            val match = config.read<List<Map<String, String>>>("$.analyzers[?(@.id == \"$analyzerId\")]").first()
            val analyzerString = objectMapper.writeValueAsString(match)
            val analyzer = jacksonObjectMapper().readValue(analyzerString, Analyzer::class.java)
            when (analyzer.config.type) {
                "fixed" -> {
                    val columns = analyzer.targetMatrix!!.include?.joinToString(separator = ", ")
                    val columnMetric = "$columns (${analyzer.config.metric})"
                    if (analyzer.config.upper != null && analyzer.config.lower != null) {
                        return "${analyzer.config.lower} < $columnMetric < ${analyzer.config.upper}"
                    } else if (analyzer.config.upper != null && analyzer.config.lower == null) {
                        return "$columnMetric < ${analyzer.config.upper}"
                    } else if (analyzer.config.upper == null && analyzer.config.lower != null) {
                        return "$columnMetric > ${analyzer.config.lower}"
                    }
                }
                "conjunction" -> {
                    val analyzers = analyzer.config.analyzerIds
                    return analyzers?.map { resolveConstraintDefinition(it, config, depth + 1) }?.joinToString(" AND ")
                }
                "disjunction" -> {
                    val analyzers = analyzer.config.analyzerIds
                    return analyzers?.map { resolveConstraintDefinition(it, config, depth + 1) }?.joinToString(" OR ")
                }
            }
        } catch (e: Exception) {
            log.error("Failed to resolve constraint definition for analyzer $analyzerId", e)
            return null
        }
        return null
    }

    fun listConstraints(orgId: String, datasetId: String): List<String> {
        val config = JsonPath.parse(load(orgId, datasetId).asJson())
        val matches = config.read<List<Map<String, String>>>("$.analyzers[?('${MonitorConfig.TAG_CONSTRAINTS}' in @.tags)]")
        if (matches.isEmpty()) {
            return emptyList()
        }
        val constraints = matches.map { match ->
            // find candidate monitor display names to set for the constraint / analyzer
            val mutableMatch = match.toMutableMap()
            val analyzerId = match["id"] ?: throw IllegalArgumentException("Analyzer missing required field 'id'")
            val monitorCandidates = config.read<List<Map<String, String>>>("$.monitors[?('$analyzerId' in @.analyzerIds)]")
            monitorCandidates.forEach { monitorCandidate ->
                val displayName = monitorCandidate["displayName"]
                if (!displayName.isNullOrEmpty()) {
                    mutableMatch["displayName"] = displayName
                }
            }
            val constraintDefinition = resolveConstraintDefinition(analyzerId, config)
            if (constraintDefinition != null) {
                mutableMatch["constraintDefinition"] = constraintDefinition
            }
            mutableMatch
        }
        return constraints.map { objectMapper.writeValueAsString(it) }
    }

    private fun tryParseJson(config: String): DocumentContext {
        return try {
            JSON.parse(config) // validate the document is valid JSON
            JsonPath.parse(config, jsonPathConfig)
        } catch (e: Exception) {
            log.info("Invalid json format provided in config.")
            throw MonitorConfigValidationException("Configuration input is not valid json.")
        }
    }

    private fun store(orgId: String, datasetId: String, configBuilder: MonitorConfig.Builder, origConfigBuilder: MonitorConfig.Builder) {
        configBuilder.addConfigProperties()
        val origConfig = origConfigBuilder.build()
        val origVersion = origConfig.version ?: 0
        val version = try {
            configBuilder.config.read<Int?>("$.metadata.version")
        } catch (e: Exception) {
            null
        }
        if (version == null) {
            // use previous version if none provided... will be incremented in save
            configBuilder.addMetadata(origVersion.toInt())
        } else {
            if (origVersion > version) {
                throw MonitorConfigValidationException("Monitor config version should be omitted, match or exceed previous version $origVersion.")
            }
            configBuilder.addMetadata()
        }
        val monitorConfig = configBuilder.build()

        configValidator.validateConfig(monitorConfig.asJson(), orgId, datasetId)
        val row = MonitorConfigV3Row()
        row.orgId = orgId
        row.datasetId = datasetId
        row.updatedTs = System.currentTimeMillis()
        row.jsonConf = monitorConfig.asJson()
        dataService.monitorConfigApi.saveMonitorConfig(row)

        // handle updates to notification action relationships
        origConfig.actions.forEach {
            // monitor config actions in the previous config no longer in the new config
            if (!monitorConfig.actions.contains(it)) {
                notificationActionHandler.deleteNotificationRelationship(orgId, it.actionId, NotificationRelationshipItem(datasetId, it.monitorId, it.monitorDisplayName, NotificationRelationshipType.MONITOR))
                log.info("Deleted notification relationship for monitor ${it.monitorId} and action ${it.actionId}")
            }
        }
        monitorConfig.monitors.forEach { monitor ->
            monitor.actions
                ?.filter { it.type == "global" }
                ?.forEach { action ->
                    try {
                        if (!origConfig.actions.contains(MonitorConfigActionMetadata(monitor.id, monitor.displayName, action.target))) {
                            val addRelationship = NotificationRelationshipItem(
                                datasetId,
                                monitor.id,
                                monitor.displayName,
                                NotificationRelationshipType.MONITOR
                            )
                            // handle display name change case
                            val isDisplayNameChange = origConfig.actions
                                .filter { it.monitorId == monitor.id && it.actionId == action.target }
                                .size > 1
                            if (isDisplayNameChange) {
                                // remove the old relationship
                                notificationActionHandler.deleteNotificationRelationship(
                                    orgId,
                                    action.target,
                                    addRelationship
                                )
                            }
                            notificationActionHandler.addNotificationRelationship(
                                orgId,
                                action.target,
                                addRelationship
                            )
                            log.info("Added notification relationship for monitor ${monitor.id} and action ${action.target} in $orgId/$datasetId")
                        }
                    } catch (e: Exception) {
                        log.error("Failed to add notification relationship for monitor ${monitor.id} and action ${action.target} in $orgId/$datasetId", e)
                    }
                }
        }

        monitorConfigUpdater.scheduleMonitorConfigUpdate(orgId, datasetId)
    }

    private fun patchOrReplace(orgId: String, datasetId: String, partialConfig: String, replace: Boolean) {
        val patchConfig = tryParseJson(partialConfig)
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val newConfigBuilder = origConfigBuilder.deepCopy()
        newConfigBuilder.updateAllowPartialTargetBatches(patchConfig.read<Boolean?>("$.allowPartialTargetBatches"))
        val patchAnalyzers = patchConfig.read<List<Map<String, String>>>("$.analyzers[*]")
        patchAnalyzers.forEach { analyzer ->
            if (!analyzer.containsKey("id")) {
                throw MonitorConfigValidationException("Missing required field 'id' in analyzer.")
            }
            newConfigBuilder.addAnalyzer(analyzer["id"].toString(), tryParseJson(objectMapper.writeValueAsString(analyzer)))
        }
        val patchMonitors = patchConfig.read<List<Map<String, String>>>("$.monitors[*]")
        patchMonitors.forEach { monitor ->
            if (!monitor.containsKey("id")) {
                throw MonitorConfigValidationException("Missing required field 'id' in monitor.")
            }
            newConfigBuilder.addMonitor(monitor["id"].toString(), tryParseJson(objectMapper.writeValueAsString(monitor)))
        }
        if (replace) {
            val analyzerIdsToKeep = patchConfig.read<List<String>>("$.analyzers.[*].id")
            val monitorIdsToKeep = patchConfig.read<List<String>>("$.monitors.[*].id")
            newConfigBuilder.listAllAnalyzerIds().forEach { analyzerId ->
                if (!analyzerIdsToKeep.contains(analyzerId)) {
                    newConfigBuilder.deleteAnalyzer(analyzerId)
                }
            }
            newConfigBuilder.listAllMonitorIds().forEach() { monitorId ->
                if (!monitorIdsToKeep.contains(monitorId)) {
                    newConfigBuilder.deleteMonitor(monitorId)
                }
            }
        }
        store(orgId, datasetId, newConfigBuilder, origConfigBuilder)
    }

    fun store(orgId: String, datasetId: String, config: String) {
        // use patch logic to make sure analyzer/monitor versions are incremented
        patchOrReplace(orgId, datasetId, config, replace = true)
    }

    fun patch(orgId: String, datasetId: String, partialConfig: String) {
        patchOrReplace(orgId, datasetId, partialConfig, replace = false)
    }

    fun handleModelDeletionEvent(orgId: String, datasetId: String) {
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val configBuilder = origConfigBuilder.deepCopy()
            .disableAllAnalyzers()
            .disableAllMonitors()
            .deleteAllMonitorActions()
        store(orgId, datasetId, configBuilder, origConfigBuilder)
    }

    fun storeAnalyzer(orgId: String, datasetId: String, analyzerId: String, config: String) {
        val analyzer = tryParseJson(config)
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val configBuilder = origConfigBuilder.deepCopy()
            .addAnalyzer(analyzerId, analyzer)
        store(orgId, datasetId, configBuilder, origConfigBuilder)
    }

    fun storeMonitor(orgId: String, datasetId: String, monitorId: String, config: String) {
        val monitor = tryParseJson(config)
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val configBuilder = origConfigBuilder.deepCopy()
            .addMonitor(monitorId, monitor)
        store(orgId, datasetId, configBuilder, origConfigBuilder)
    }

    fun deleteAnalyzer(orgId: String, datasetId: String, analyzerId: String) {
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val configBuilder = origConfigBuilder.deepCopy()
            .deleteAnalyzer(analyzerId, deleteReferences = true)
        store(orgId, datasetId, configBuilder, origConfigBuilder)
        // delete analyzer results for the deleted analyzer
        datasetProfileManager.deleteAnalyzerResults(orgId, datasetId, analyzerId, 0, System.currentTimeMillis())
    }

    fun deleteMonitor(orgId: String, datasetId: String, monitorId: String) {
        val origConfigBuilder = loadMonitorConfigBuilder(orgId, datasetId)
        val configBuilder = origConfigBuilder.deepCopy()
        val analyzerList = configBuilder.listAnalyzers(monitorId)
        configBuilder.deleteMonitor(monitorId)
        store(orgId, datasetId, configBuilder, origConfigBuilder)
        analyzerList.forEach { analyzerId ->
            // delete analyzer results for the deleted monitor
            datasetProfileManager.deleteAnalyzerResults(orgId, datasetId, analyzerId, 0, System.currentTimeMillis())
        }
    }
}

data class MonitorConfigFileMetadata(val orgId: String, val datasetId: String)

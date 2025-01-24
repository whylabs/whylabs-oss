package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.operations.getCurrentRequestId
import ai.whylabs.songbird.operations.getRequestUserId
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.v0.models.TimePeriod
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.jayway.jsonpath.Configuration
import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import com.jayway.jsonpath.Option

class MonitorConfig constructor(
    val config: DocumentContext
) {
    private val objectMapper = jacksonObjectMapper()
    private val jsonPathConfig = Configuration.defaultConfiguration().addOptions(Option.SUPPRESS_EXCEPTIONS)

    // Config components for storing into DynamoDB
    val monitorsAsString: String = objectMapper.writeValueAsString(config.read<List<Map<String, String>>>("$.monitors"))
    val monitors: List<Monitor> = objectMapper.readValue(monitorsAsString, object : TypeReference<List<Monitor>>() {})
    val actions: Set<MonitorConfigActionMetadata> = monitors.flatMap { monitor ->
        monitor.actions?.map { action ->
            MonitorConfigActionMetadata(monitor.id, monitor.displayName, action.target)
        } ?: emptyList()
    }.toSet()
    val analyzersAsString: String = objectMapper.writeValueAsString(config.read<List<Map<String, String>>>("$.analyzers"))
    val base: String
    val minimal: String
    val version: Long? = config.read<Int?>("$.metadata.version")?.toLong()

    init {
        // separate document since the config should be immutable
        val document = JsonPath.parse(config.jsonString(), jsonPathConfig)
        // extract the config components, non-destructive to the monitor config
        // do not store entity schema in the base document
        document.delete("$.entitySchema")
        // do not store entity weights in the base document
        document.delete("$.weightConfig")
        minimal = document.jsonString()

        document.delete("$.monitors")
        document.delete("$.analyzers")
        base = document.jsonString()
    }

    fun asJson(): String {
        return config.jsonString()
    }

    companion object {
        const val TAG_CONSTRAINTS = "whylabs.constraint"
        val SUPPORTED_TYPES_CONSTRAINTS = setOf(
            "conjunction",
            "disjunction",
            "fixed"
        )
        val jsonPathConfiguration: Configuration = Configuration.defaultConfiguration().addOptions(Option.SUPPRESS_EXCEPTIONS)
    }

    data class Builder(val orgId: String, val datasetId: String, val config: DocumentContext) {
        private val userIdRegex = Regex("[^A-Za-z0-9-]")

        constructor(orgId: String, datasetId: String, config: String) : this(orgId, datasetId, JsonPath.parse(config, jsonPathConfiguration))

        fun deepCopy(): Builder {
            return Builder(orgId, datasetId, JsonPath.parse(config.jsonString(), jsonPathConfiguration))
        }

        fun addConfigProperties() = apply {
            try {
                config
                    .put("$", "orgId", orgId)
                    .put("$", "datasetId", datasetId)
            } catch (e: Exception) {
                throw IllegalArgumentException("Config must be a non-empty JSON object.")
            }
        }

        fun addGranularity(timePeriod: TimePeriod) = apply {
            val granularity = when (timePeriod) {
                TimePeriod.PT1H -> "hourly"
                TimePeriod.P1D -> "daily"
                TimePeriod.P1W -> "weekly"
                TimePeriod.P1M -> "monthly"
                else -> throw IllegalArgumentException("Time period $timePeriod is not supported yet")
            }

            config.put("$", "granularity", granularity)
        }

        fun updateAllowPartialTargetBatches(allowPartial: Boolean?) = apply {
            if (allowPartial == null) {
                config.delete("$.allowPartialTargetBatches")
                return@apply
            }
            config.put("$", "allowPartialTargetBatches", allowPartial)
        }

        private fun addMetadata(element: DocumentContext, version: Int? = null) {
            val identity = getValidatedIdentity()
            val author = if (identity?.principalId?.startsWith("arn:aws:sts") == true) {
                getRequestUserId() ?: "system"
            } else {
                identity?.principalId ?: getCurrentRequestId() ?: "api"
            }

            val nextVersion = (version ?: (element.read<Int?>("$.metadata.version") ?: 0)) + 1

            element
                .put("$", "metadata", HashMap<String, String>())
                .put("$.metadata", "author", userIdRegex.replace(author, "_"))
                .put("$.metadata", "updatedTimestamp", System.currentTimeMillis())
                .put("$.metadata", "version", nextVersion)
                .put("$.metadata", "schemaVersion", 1)
        }

        fun addMetadata(version: Int? = null) = apply {
            addMetadata(config, version)
        }

        fun deleteMonitor(monitorId: String) = apply {
            config.delete("$.monitors[?(@.id == '$monitorId')]")
        }

        fun deleteAnalyzer(analyzerId: String, deleteReferences: Boolean = false) = apply {
            config.delete("$.analyzers[?(@.id == '$analyzerId')]")
            if (deleteReferences) {
                // delete analyzers from monitors
                config.delete("$.monitors[*].analyzerIds[?(@ == '$analyzerId')]")
            }
        }

        fun addMonitor(monitorId: String, monitor: DocumentContext) = apply {
            monitor.put("$", "id", monitorId)
            val versionQueryResults = config.read<List<Int>>("$.monitors[?(@.id == '$monitorId')].metadata.version")
            val version = resolveVersionFromQueryResults(versionQueryResults)
            addMetadata(monitor, version)
            if (config.read<List<String>>("$.monitors[?(@.id == '$monitorId')]").isNotEmpty()) {
                deleteMonitor(monitorId)
            }
            config.add("$.monitors", monitor.json())
        }

        fun addAnalyzer(analyzerId: String, analyzer: DocumentContext) = apply {
            analyzer.put("$", "id", analyzerId)
            val versionQueryResults = config.read<List<Int>>("$.analyzers[?(@.id == '$analyzerId')].metadata.version")
            val version = resolveVersionFromQueryResults(versionQueryResults)
            addMetadata(analyzer, version)
            if (config.read<List<String>>("$.analyzers[?(@.id == '$analyzerId')]").isNotEmpty()) {
                deleteAnalyzer(analyzerId, deleteReferences = false)
            }
            config.add("$.analyzers", analyzer.json())
        }

        fun disableAllAnalyzers() = apply {
            if (listAllAnalyzerIds().isNotEmpty()) {
                config.put("$.analyzers[*]", "disabled", true)
            }
        }

        fun disableAllMonitors() = apply {
            if (listAllMonitorIds().isNotEmpty()) {
                config.put("$.monitors[*]", "disabled", true)
            }
        }

        fun deleteAllMonitorActions() = apply {
            if (listAllMonitorIds().isNotEmpty()) {
                config.put("$.monitors[*]", "actions", emptyList<MonitorAction>())
            }
        }

        fun listAnalyzers(monitorId: String): List<String> {
            return config.read<List<List<String>>>("$.monitors[?(@.id == '$monitorId')].analyzerIds").first()
        }

        fun listAllMonitorIds(): List<String> {
            return config.read("$.monitors.[*].id")
        }

        fun listAllAnalyzerIds(): List<String> {
            return config.read("$.analyzers.[*].id")
        }

        private fun resolveVersionFromQueryResults(queryResults: List<Int>): Int {
            return if (queryResults.isEmpty()) {
                0
            } else {
                queryResults.first()
            }
        }

        fun build(): MonitorConfig {
            return MonitorConfig(config)
        }
    }
}

data class MonitorConfigActionMetadata(
    val monitorId: String,
    val monitorDisplayName: String? = null,
    val actionId: String,
)

package ai.whylabs.songbird.util

import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.stream.Collectors

enum class LocalResource(val path: String) {
    MonitorConfigBase("/monitor/base.json"),
    MonitorConfigSchemaJson("/monitor/schema.json"),
    MonitorConfigSchemaYml("/monitor/schema.yml"),
    PolicyConfigSchema("/secure/policy_schema.json"),
    OpenSearchMappingFeatureWeights("/opensearch/feature_weight_mapping.json"),
    OpenSearchMappingSchema("/opensearch/schema_mapping.json");

    fun asString(): String {
        return javaClass.getResourceAsStream(path)
            .use { `in` ->
                BufferedReader(InputStreamReader(`in`)).use { reader ->
                    reader.lines().collect(Collectors.joining())
                }
            }
    }
}

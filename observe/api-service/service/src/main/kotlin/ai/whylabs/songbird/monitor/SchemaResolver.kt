package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.logging.JsonLogging
import jakarta.inject.Inject
import jakarta.inject.Singleton
import net.pwall.json.schema.JSONSchema

@Singleton
class SchemaResolver @Inject constructor(
    private val localSchemaProvider: LocalSchemaProvider,
) : JsonLogging {
    fun resolveSchema(): JSONSchema {
        val schemaProviders = listOf(
            localSchemaProvider
        )

        return schemaProviders.mapNotNull { it.getSchema() }.first()
    }
}

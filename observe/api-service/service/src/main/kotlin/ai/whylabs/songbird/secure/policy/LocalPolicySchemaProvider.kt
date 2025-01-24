import ai.whylabs.songbird.monitor.SchemaProvider
import ai.whylabs.songbird.util.LocalResource
import net.pwall.json.schema.JSONSchema

class LocalPolicySchemaProvider : SchemaProvider {
    override fun getSchema(): JSONSchema? {
        return try {
            val schemaContents = LocalResource.PolicyConfigSchema.asString()
            val schema = JSONSchema.parse(schemaContents)
            return schema
        } catch (e: Exception) {
            log.info("Unable to resolve LocalPolicySchemaProvider: {}", e)
            null
        }
    }
}

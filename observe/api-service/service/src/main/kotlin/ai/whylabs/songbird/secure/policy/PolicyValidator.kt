package ai.whylabs.songbird.secure.policy

import LocalPolicySchemaProvider
import ai.whylabs.songbird.common.SchemaRulesChecker
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.SchemaValidationException
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.micrometer.core.instrument.MeterRegistry
import jakarta.inject.Inject
import jakarta.inject.Singleton
import net.pwall.json.schema.JSONSchema

@Singleton
class PolicyValidator @Inject constructor(
    private val meterRegistry: MeterRegistry
) : JsonLogging {
    private val yamlMapper = ObjectMapper(YAMLFactory())
    val schema: JSONSchema = LocalPolicySchemaProvider().getSchema() ?: throw IllegalStateException("Policy configuration schema not found")

    fun checkValidPolicyConfiguration(yaml: String) {
        val obj = yamlMapper.readValue(yaml, Any::class.java)
        val config = jacksonObjectMapper().writeValueAsString(obj)
        val checker = SchemaRulesChecker(schema)
        val errorMsg = checker.checkSchemaRules(config)
        if (errorMsg != null) {
            meterRegistry.counter("Secure.Policy.ValidationError.SchemaValidation").increment()
            throw SchemaValidationException("Policy schema errors found: $errorMsg")
        }
    }
}

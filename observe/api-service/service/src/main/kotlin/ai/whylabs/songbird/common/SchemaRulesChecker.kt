package ai.whylabs.songbird.common

import ai.whylabs.songbird.logging.JsonLogging
import net.pwall.json.pointer.JSONPointer
import net.pwall.json.schema.JSONSchema
import net.pwall.json.schema.output.DetailedOutput

class SchemaRulesChecker(
    val schema: JSONSchema,
) : JsonLogging {
    private fun parseDetailedErrorOutput(error: DetailedOutput, onlyIncludeFirst: Boolean = false, verbose: Boolean = false): String {
        return error.errors?.filterIndexed { index, _ -> !onlyIncludeFirst || index == 0 }?.joinToString(separator = "") {
            when (it) {
                is DetailedOutput ->
                    if (it.errors.isNullOrEmpty()) {
                        generateErrorMessage(it, verbose)
                    } else {
                        if (it.keywordLocation.contains("oneOf/")) {
                            // oneOf conditions list out all the reasons unrelated types may not be valid.
                            // We only care about the first reason it finds per oneOf instance
                            parseDetailedErrorOutput(it, onlyIncludeFirst = true, verbose = verbose)
                        } else {
                            parseDetailedErrorOutput(it, onlyIncludeFirst = false, verbose = verbose)
                        }
                    }
                else ->
                    "Unknown error."
            }
        } ?: "Internal error"
    }

    private fun generateErrorMessage(output: DetailedOutput, verbose: Boolean = false): String {
        return if (output.keywordLocation.endsWith("\$ref/additionalProperties")) {
            if (output.keywordLocation.contains("/oneOf/")) {
                // Omit unexpected property error message for oneOf conditions. This should just be the expected/assumed oneOf non-matching case
                if (verbose) {
                    "Failed oneOf condition at ${output.instanceLocation} on condition ${output.keywordLocation} with error ${output.error}. "
                } else {
                    ""
                }
            } else {
                "Unexpected property found at ${output.instanceLocation} when checking schema condition ${output.keywordLocation.removePrefix("#/properties")
                    .removeSuffix("\$ref/additionalProperties")}. "
            }
        } else if (output.keywordLocation.contains("/oneOf/")) {
            "Validation for oneOf subschema (only one subschema will need to match) failed at ${output.instanceLocation} on condition ${output.keywordLocation} with error ${output.error}. "
        } else {
            "Schema validation error at ${output.instanceLocation} on condition ${output.keywordLocation} with error ${output.error}. "
        }
    }

    fun checkSchemaRules(config: String, verbose: Boolean = false): String? {
        val output = schema.validateDetailed(config)
        if (!output.errors.isNullOrEmpty()) {
            return parseDetailedErrorOutput(output, verbose = verbose)
        }
        return null
    }

    fun checkSchemaRules(config: String, instanceLocation: JSONPointer, verbose: Boolean = false): String? {
        val output = schema.validateDetailed(config, instanceLocation)
        if (!output.errors.isNullOrEmpty()) {
            return parseDetailedErrorOutput(output, verbose = verbose)
        }
        return null
    }
}

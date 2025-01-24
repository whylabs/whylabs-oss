package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.JsonPath
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class ColumnTargetIncludeValidatorTest {
    @Test
    fun `validation returns warning when targetMatrix is column and include is empty`() {
        val config = """
            {
                "analyzers": [
                    {
                        "id": "analyzer1",
                        "targetMatrix": {
                            "type": "column",
                            "include": [],
                            "exclude": []
                        }
                    }
                ]
            }
        """.trimIndent()

        val documentContext = JsonPath.parse(config)
        val validator = ColumnTargetIncludeValidator()
        val result = validator.validation(documentContext)

        Assertions.assertTrue(result is ValidatorResult.Warning)
    }

    @Test
    fun `validation succeeds when targetMatrix is of dataset type`() {
        val config = """
            {
                "analyzers": [
                    {
                        "id": "analyzer1",
                        "targetMatrix": {
                            "type": "dataset"
                        }
                    }
                ]
            }
        """.trimIndent()

        val documentContext = JsonPath.parse(config)
        val validator = ColumnTargetIncludeValidator()
        val result = validator.validation(documentContext)

        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation succeeds when at least one include item is present`() {
        val config = """
            {
                "analyzers": [
                    {
                        "id": "analyzer1",
                        "targetMatrix": {
                            "type": "column",
                            "include": ["item1"]
                        }
                    }
                ]
            }
        """.trimIndent()

        val documentContext = JsonPath.parse(config)
        val validator = ColumnTargetIncludeValidator()
        val result = validator.validation(documentContext)

        Assertions.assertTrue(result is ValidatorResult.Success)
    }
}

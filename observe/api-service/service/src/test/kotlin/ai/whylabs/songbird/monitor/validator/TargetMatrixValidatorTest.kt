package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class TargetMatrixValidatorTest {

    @Test
    fun `validation returns success when targetMatrix is not null`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "test",
                  "config": {
                    "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "dataset",
                    "segments": []
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation returns warning when targetMatrix is null`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "test",
                  "config": {
                    "type": "diff"
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Warning)
    }

    @Test
    fun `validation returns success when there are no analyzers`() {
        val configJson = """
            {
              "analyzers": []
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }
}

package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class MonitorOffsetValidatorTest {

    @Test
    fun `validation returns success when offset is valid`() {
        val configJson = """
            {
              "orgId": "test-org",
              "monitors": [
                {
                  "id": "test",
                  "mode": {
                    "datasetTimestampOffset": "PT1H"
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = MonitorOffsetValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation returns warning when offset is invalid`() {
        val configJson = """
            {
              "orgId": "test-org",
              "monitors": [
                {
                  "id": "test",
                  "mode": {
                    "datasetTimestampOffset": "P1H"
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = MonitorOffsetValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Error)
    }

    @Test
    fun `validation is ok when config has no offset`() {
        val configJson = """
            {
              "orgId": "test-org",
              "monitors": [
                {
                  "id": "test",
                  "mode": {
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = MonitorOffsetValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }
}

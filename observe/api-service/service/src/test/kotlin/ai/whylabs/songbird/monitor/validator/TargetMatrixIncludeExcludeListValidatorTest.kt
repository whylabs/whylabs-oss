package ai.whylabs.songbird.monitor.validator

import com.jayway.jsonpath.DocumentContext
import com.jayway.jsonpath.JsonPath
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class TargetMatrixIncludeExcludeListValidatorTest {

    @Test
    fun `validation returns success when include and exclude lists are valid`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                        "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": ["column_1, column_1, column_1"],
                    "exclude": ["group:continuous"]
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation returns warning when include list is invalid`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                        "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": ["group:frac"],
                    "exclude": ["example_feature"]
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Warning)
        Assertions.assertTrue { (result as ValidatorResult.Warning).message.contains("include List") }
    }

    @Test
    fun `validation returns warning when exclude list is invalid`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                        "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": ["example_feature"],
                    "exclude": ["group:int"]
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Warning)
        Assertions.assertTrue { (result as ValidatorResult.Warning).message.contains("exclude List") }
    }

    @Test
    fun `validation returns success if exclude is empty`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                        "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": ["some_col"],
                    "exclude": []
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation returns warning if include is empty`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                        "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": [],
                    "exclude": ["some_col"]
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Warning)
        Assertions.assertTrue { (result as ValidatorResult.Warning).message.contains("include List") }
    }

    @Test
    fun `validation returns success when there are no analyzers`() {
        val configJson = """
            {
              "analyzers": []
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    @Test
    fun `validation returns success when targetMatrix is of type dataset`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                    "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "dataset",
                    "include": [],
                    "exclude": []
                  }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Success)
    }

    // TODO test for multiple targetMatrices -> one valid and one invalid
    @Test
    fun `multiple analyzers fail if one of them is invalid`() {
        val configJson = """
            {
              "analyzers": [
                {
                  "id": "analyzer1",
                  "config": {
                    "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "column",
                    "include": ["example"],
                    "exclude": []
                  }
                },
                {
                  "id": "analyzer2",
                  "config": {
                    "type": "diff"
                  },
                  "targetMatrix": {
                    "type": "dataset",
                    "include": [],
                    "exclude": []
                  }
                },
                {
                    "id": "analyzer3",
                    "config": {
                        "type": "diff"
                    },
                    "targetMatrix": {
                        "type": "column",
                        "include": [],
                        "exclude": []
                    }
                }
              ]
            }
        """.trimIndent()
        val config: DocumentContext = JsonPath.parse(configJson)
        val validator = TargetMatrixIncludeExcludeListValidator()
        val result = validator.validation(config)
        Assertions.assertTrue(result is ValidatorResult.Warning)
    }
}

package ai.whylabs.songbird.monitor.validator

import ai.whylabs.songbird.v0.dao.NotificationActionDAO
import com.jayway.jsonpath.JsonPath
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class GlobalActionValidatorTest {
    private val notificationActionDAO: NotificationActionDAO = mockk()
    @Test
    fun `test globalActions is empty`() {
        val globalActionValidator = GlobalActionValidator(notificationActionDAO)
        val config = """
            {
                "orgId": "orgId",
                "monitors": []
            }
        """.trimIndent()

        val result = globalActionValidator.validation(JsonPath.parse(config))
        Assertions.assertEquals(result, ValidatorResult.Success)
    }

    @Test
    fun `test globalActions is not empty`() {
        val globalActionValidator = GlobalActionValidator(notificationActionDAO)

        val config = """
            {
                "orgId": "orgId",
                "monitors": [
                    {
                        "actions": [
                            {
                                "type": "global",
                                "target": "email"
                            }
                        ]
                    }
                ]
            }
        """.trimIndent()

        every { notificationActionDAO.getNotificationAction("orgId", "email") } returns mockk()

        val result = globalActionValidator.validation(JsonPath.parse(config))
        Assertions.assertEquals(ValidatorResult.Success, result)
    }

    @Test
    fun `test globalActions is not empty and target is missing`() {
        val globalActionValidator = GlobalActionValidator(notificationActionDAO)
        val config = """
            {
                "orgId": "orgId",
                "monitors": [
                    {
                        "actions": [
                            {
                                "type": "global"
                            }
                        ]
                    }
                ]
            }
        """.trimIndent()

        val result = globalActionValidator.validation(JsonPath.parse(config))
        Assertions.assertTrue((result is ValidatorResult.Error) && (result.message == "A global action is configured without a target."))
    }

    @Test
    fun `test globalActions is not empty and target is invalid`() {
        val globalActionValidator = GlobalActionValidator(notificationActionDAO)
        val config = """
            {
                "orgId": "orgId",
                "monitors": [
                    {
                        "actions": [
                            {
                                "type": "global",
                                "target": "null"
                            }
                        ]
                    }
                ]
            }
        """.trimIndent()

        every { notificationActionDAO.getNotificationAction("orgId", "null") } returns null

        val result = globalActionValidator.validation(JsonPath.parse(config))
        Assertions.assertTrue((result is ValidatorResult.Error) && (result.message == "Unable to find notification action target ID null."))
    }
}

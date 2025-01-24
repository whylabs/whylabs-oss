package ai.whylabs.songbird.notification

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.getCurrentRequestId
import com.amazonaws.services.sqs.AmazonSQS
import com.amazonaws.services.sqs.model.SendMessageRequest
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.UUID

@Singleton
class NotificationTester @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val sqs: AmazonSQS,
) : JsonLogging {
    private val mapper = jacksonObjectMapper()

    fun testAction(orgId: String, actionId: String) {
        log.info("Sending test notification for org:$orgId action:$actionId")
        sendNotificationTestMessage(orgId, actionId)
    }

    private fun sendNotificationTestMessage(orgId: String, actionId: String) {
        val queueName = environmentConfig.getEnv(EnvironmentVariable.TestNotificationQueueArn).substringAfterLast(":")
        val url = sqs.getQueueUrl(queueName).queueUrl
        val body = NotificationTestMessage(orgId, actionId)
        val message = SendMessageRequest()
            .withQueueUrl(url)
            .withMessageBody(mapper.writeValueAsString(body))
            .withMessageGroupId(orgId)
            .withMessageDeduplicationId(getCurrentRequestId() ?: UUID.randomUUID().toString()) // 5-minute deduplication interval
        sqs.sendMessage(message)
    }
}

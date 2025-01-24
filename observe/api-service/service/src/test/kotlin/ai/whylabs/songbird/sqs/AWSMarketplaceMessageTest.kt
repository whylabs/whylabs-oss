package ai.whylabs.songbird.sqs

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

internal class AWSMarketplaceMessageTest {

    private val mapper = jacksonObjectMapper()

    @Test
    fun `test message deserializes`() {
        val subscriptionMessage =
            """
{
    "action": "${SubscriptionAction.SubscriptionSuccess.action}",
    "customer-identifier": "X01EXAMPLEX",
    "product-code": "n0123EXAMPLEXXXXXXXXXXXX",
    "offer-identifier": "offer-abcexample123"
} 
            """.trimIndent()

        val message = mapper.readValue<AWSMarketplaceMessage>(subscriptionMessage)

        assertEquals(message.action, SubscriptionAction.SubscriptionSuccess)
        assertEquals(message.customerIdentifier, "X01EXAMPLEX")
        assertEquals(message.productCode, "n0123EXAMPLEXXXXXXXXXXXX")
        assertEquals(message.offerIdentifier, "offer-abcexample123")
    }

    @Test
    fun `test message deserializes with multiple actions`() {
        val subscriptionMessage =
            """
{
    "action": "${SubscriptionAction.EntitlementUpdated.action}",
    "customer-identifier": "X01EXAMPLEX",
    "product-code": "n0123EXAMPLEXXXXXXXXXXXX",
    "offer-identifier": "offer-abcexample123"
} 
            """.trimIndent()

        val message = mapper.readValue<AWSMarketplaceMessage>(subscriptionMessage)

        assertEquals(message.action, SubscriptionAction.EntitlementUpdated)
        assertEquals(message.customerIdentifier, "X01EXAMPLEX")
        assertEquals(message.productCode, "n0123EXAMPLEXXXXXXXXXXXX")
        assertEquals(message.offerIdentifier, "offer-abcexample123")
    }

    @Test
    fun `test message deserializes without offer identifier`() {
        val subscriptionMessage =
            """
{
    "action": "subscribe-success",
    "customer-identifier": "X01EXAMPLEX",
    "product-code": "n0123EXAMPLEXXXXXXXXXXXX"
} 
            """.trimIndent()

        val message = mapper.readValue<AWSMarketplaceMessage>(subscriptionMessage)

        assertEquals(message.action, SubscriptionAction.SubscriptionSuccess)
        assertEquals(message.customerIdentifier, "X01EXAMPLEX")
        assertEquals(message.productCode, "n0123EXAMPLEXXXXXXXXXXXX")
        assertEquals(message.offerIdentifier, null)
    }
}

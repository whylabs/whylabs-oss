package ai.whylabs.songbird.v0.controllers

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.payment.PaymentEventHandler
import ai.whylabs.songbird.v0.ddb.SubscriptionType
import com.amazonaws.services.secretsmanager.AWSSecretsManager
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import com.stripe.Stripe
import com.stripe.StripeClient
import com.stripe.exception.SignatureVerificationException
import com.stripe.model.Subscription
import com.stripe.model.checkout.Session
import com.stripe.net.Webhook
import io.micronaut.http.HttpHeaders
import io.micronaut.http.MediaType
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import io.swagger.v3.oas.annotations.tags.Tags
import jakarta.inject.Inject

@Controller("/v0/payment")
@Secured(SecurityRule.IS_ANONYMOUS)
@Tags(
    Tag(name = "Payment", description = "Endpoint for payment webhooks"),
    Tag(name = "Internal", description = "Internal API"),
)
class PaymentController @Inject constructor(
    val config: EnvironmentConfig,
    secretsManager: AWSSecretsManager,
    private val paymentEventHandler: PaymentEventHandler,
) : JsonLogging {
    private val stripeEndpointSecret = try {
        val request = GetSecretValueRequest().withSecretId("${config.getStage().name.lowercase()}/songbird/stripe")
        val secretString = secretsManager.getSecretValue(request).secretString
        val stripeSecret = Gson().fromJson(secretString, StripeSecret::class.java)
        stripeSecret.endpoint_secret
    } catch (e: Exception) {
        throw IllegalStateException("Unable to retrieve Stripe secrets", e)
    }
    private val stripeClient = StripeClient(stripeEndpointSecret)

    @Operation(
        operationId = "StripePaymentEndpoint",
        summary = "Endpoint for Stripe payment webhooks",
        description = "Endpoint for Stripe payment webhooks",
    )
    @Post(
        uri = "/stripe",
        produces = [MediaType.APPLICATION_JSON]
    )
    suspend fun stripeWebhook(
        headers: HttpHeaders,
        @Body payload: String,
    ): Response {
        val sigHeader = headers["Stripe-Signature"]
        val event = try {
            Webhook.constructEvent(payload, sigHeader, stripeEndpointSecret)
        } catch (e: JsonSyntaxException) {
            throw IllegalArgumentException("Invalid payload provided")
        } catch (e: SignatureVerificationException) {
            throw IllegalArgumentException("Invalid signature")
        } catch (e: Exception) {
            throw IllegalArgumentException("Invalid request format")
        }
        val dataObjectDeserializer = event.dataObjectDeserializer
        val stripeObject = if (dataObjectDeserializer.getObject().isPresent) {
            dataObjectDeserializer.getObject().get()
        } else {
            log.error("Received event with API version ${event.apiVersion} and type ${event.type}. This application is using API version ${Stripe.API_VERSION}")
            // Deserialization failed, probably due to an API version mismatch.
            // Refer to the Javadoc documentation on `EventDataObjectDeserializer`
            // https://www.javadoc.io/doc/com.stripe/stripe-java/9.7.0/com/stripe/model/EventDataObjectDeserializer.html
            throw IllegalArgumentException("Failed deserialization of event payload")
        }
        log.info("Received Stripe payment webhook message type: ${event.type}")
        when (event.type) {
            "checkout.session.completed" -> {
                val session = stripeObject as Session
                log.info("Processing checkout.session.completed: ${session.id}")
                paymentEventHandler.paymentCompleteEvent(session)
            }
            "customer.subscription.deleted" -> {
                val subscription = stripeObject as Subscription
                log.info("Processing customer.subscription.deleted: ${subscription.id}")
                paymentEventHandler.subscriptionDeleteEvent(subscription.id, SubscriptionType.STRIPE)
            }
            else -> {
                log.warn("Unhandled payment event type: ${event.type}")
            }
        }
        return Response()
    }
}

data class StripeSecret(val endpoint_secret: String, val api_key: String)

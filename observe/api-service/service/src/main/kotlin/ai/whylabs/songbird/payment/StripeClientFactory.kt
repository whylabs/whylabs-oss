package ai.whylabs.songbird.payment

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.controllers.StripeSecret
import com.amazonaws.services.secretsmanager.AWSSecretsManager
import com.amazonaws.services.secretsmanager.model.GetSecretValueRequest
import com.google.gson.Gson
import com.stripe.StripeClient
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

@Factory
class StripeClientFactory(config: EnvironmentConfig, secretsManager: AWSSecretsManager,) : JsonLogging {
    private val stripeApiKey = try {
        val request = GetSecretValueRequest().withSecretId("${config.getStage().name.lowercase()}/songbird/stripe")
        val secretString = secretsManager.getSecretValue(request).secretString
        val stripeSecret = Gson().fromJson(secretString, StripeSecret::class.java)
        stripeSecret.api_key
    } catch (e: Exception) {
        throw IllegalStateException("Unable to retrieve Stripe secrets", e)
    }

    @Singleton
    fun stripeClient(): StripeClient {
        return StripeClient(stripeApiKey)
    }
}

package ai.whylabs.songbird.operations

import ai.whylabs.songbird.cache.TokenBucketProvider
import ai.whylabs.songbird.common.WhyLabsAttributes
import ai.whylabs.songbird.logging.JsonLogging
import io.micrometer.core.instrument.MeterRegistry
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import io.micronaut.http.filter.ServerFilterPhase
import io.micronaut.http.server.util.HttpClientAddressResolver
import io.micronaut.scheduling.annotation.Scheduled
import jakarta.inject.Inject
import org.apache.commons.net.util.SubnetUtils
import org.reactivestreams.Publisher

@Filter("/**")
class TokenBucketRateLimitFilter
@Inject constructor(
    private val featureFlagClient: FeatureFlagClient,
    private val meterRegistry: MeterRegistry,
    private val tokenBucketProvider: TokenBucketProvider,
    private val ipAllowListValidator: IpAllowListValidator,
    private val httpClientAddressResolver: HttpClientAddressResolver,
) : HttpServerFilter, JsonLogging {

    private val rateLimitCounter = mutableMapOf<String, Int>()

    private val allowedSubnets = listOf(
        SubnetUtils("10.0.0.0/16").info, // VPC
        SubnetUtils("172.17.17.0/24").info, // Kubernetes
    )

    @Scheduled(fixedDelay = "60s", initialDelay = "60s")
    fun execute() {
        rateLimitCounter.forEach { (orgId, count) ->
            log.warn("Rate limit exceeded for organization $orgId. Count: $count")
        }
        rateLimitCounter.clear()
    }

    override fun doFilter(request: HttpRequest<*>, chain: ServerFilterChain): Publisher<MutableHttpResponse<*>> {
        if (!tokenBucketProvider.enabled()) {
            return chain.proceed(request)
        }
        if (!featureFlagClient.hasGlobalFlag(FeatureFlag.REDIS_RATE_LIMITING)) {
            return chain.proceed(request)
        }
        val ipAddressHeader = request.headers["X-Forwarded-For"] ?: httpClientAddressResolver.resolve(request)
        val ipAddress = ipAddressHeader.split(",").firstOrNull()?.trim() ?: "unknown-source-ip"
        val identity = getValidatedIdentity()
        val bypassSubnetMatch = if (ipAddress.contains(":")) {
            null // IPV6 not supported for bypass
        } else {
            try {
                allowedSubnets.firstOrNull {
                    it.isInRange(ipAddress)
                }
            } catch (e: Exception) {
                log.warn("Exception with subnet matching. Exception: {}", e.message)
                null
            }
        }
        if (identity == null && bypassSubnetMatch != null) {
            // Internal subnet bypass for health checks and pings
            meterRegistry.counter("rate.limit.bypass.subnet").increment()
            log.debug("Rate limit bypassed for subnet: ${bypassSubnetMatch.cidrSignature}")
            return chain.proceed(request)
        }
        if (featureFlagClient.hasGlobalFlag(FeatureFlag.API_IP_ALLOWLIST) && !ipAllowListValidator.isAllowed(identity?.orgId, ipAddress)) {
            meterRegistry.counter("rate.limit.block.organization.ip").increment()
            log.info("Request for org ${identity?.orgId} blocked by ip allowlist. IP: $ipAddress")
            return Publishers.just(
                HttpResponse.status<String>(HttpStatus.FORBIDDEN).body("Requests from this location are not permitted by your organization.")
            )
        }
        if (identity?.principalId?.startsWith("arn:aws:sts") == true) {
            meterRegistry.counter("rate.limit.bypass.sts").increment()
            return chain.proceed(request)
        }
        try {
            val bucket = tokenBucketProvider.getBucketProxy(request)
            log.debug("Rate limit bucket capacity: {}", bucket.availableTokens)
            if (!bucket.tryConsume(1)) {
                meterRegistry.counter("rate.limit.requests").increment()
                val orgId = getRequestAttribute(WhyLabsAttributes.RequestOrganizationId)?.toString()
                rateLimitCounter[orgId ?: "0"] = (rateLimitCounter[orgId] ?: 0) + 1
                return Publishers.just(
                    HttpResponse.status<String>(HttpStatus.TOO_MANY_REQUESTS).body("Too many requests. Please try again later.")
                )
            }

            return chain.proceed(request)
        } catch (e: Throwable) {
            log.warn("Exception with Jedis bucket rate limiting. Exception: {}", e.message)
            return chain.proceed(request)
        }
    }

    override fun getOrder(): Int {
        return ServerFilterPhase.SECURITY.after()
    }
}

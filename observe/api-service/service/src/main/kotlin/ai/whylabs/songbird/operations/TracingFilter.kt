package ai.whylabs.songbird.operations

import ai.whylabs.songbird.logging.JsonLogging
import io.micrometer.core.instrument.MeterRegistry
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpRequest
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import org.reactivestreams.Publisher
import java.time.Instant
import java.util.UUID
import java.util.concurrent.TimeUnit

@Filter("/**")
class TracingFilter(meterRegistry: MeterRegistry) : HttpServerFilter, JsonLogging {
    private val timer = meterRegistry.timer("http.server.requests.duration")

    override fun doFilter(request: HttpRequest<*>, chain: ServerFilterChain): Publisher<MutableHttpResponse<*>> {
        val requestId = request.headers[RequestId] ?: UUID.randomUUID().toString()
        request.attributes.put(RequestId, requestId)
        val receiveTime = Instant.now().toEpochMilli()

        val publisher = chain.proceed(request)
        return Publishers.then(publisher) {
            it.headers.set(RequestId, requestId)
            it.headers.set(AccessControlAllowOrigin, "*")

            // recording metrics
            val responseTime = Instant.now().toEpochMilli()
            val duration = responseTime - receiveTime
            timer.record(duration, TimeUnit.MILLISECONDS)
            log.debug {
                msg { "Duration: $duration ms" }
            }
        }
    }

    companion object {
        const val RequestId = "X-Request-Id"
        const val AccessControlAllowOrigin = "Access-Control-Allow-Origin"
        const val MicronautAuthentication = "micronaut.AUTHENTICATION"
        const val MicronautAuthenticationAttributeKey = "key"
    }
}

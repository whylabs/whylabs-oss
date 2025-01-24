package ai.whylabs.songbird.operations

import ai.whylabs.songbird.logging.JsonLogging
import io.micrometer.core.instrument.MeterRegistry
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpAttributes
import io.micronaut.http.HttpRequest
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import jakarta.inject.Inject
import org.reactivestreams.Publisher

@Filter("/**")
class ResponseMetricsFilter
@Inject constructor(private val meterRegistry: MeterRegistry) : HttpServerFilter, JsonLogging {

    /**
     * This will return the resolved URI template for a path, null if the path doesn't match a URI template
     * For example, the path /v0/organizations/org-1 will return /v0/organizations/{org_id}
     * /path-not-supported will return null
     */
    fun resolveUriTemplatePath(request: HttpRequest<*>): String? {
        return request.getAttribute(HttpAttributes.URI_TEMPLATE).orElse(null) as String?
    }

    override fun doFilter(request: HttpRequest<*>, chain: ServerFilterChain): Publisher<MutableHttpResponse<*>> {
        val publisher = chain.proceed(request)
        return Publishers.then(publisher) {
            val responseCode = it.status.code
            val uriTemplate = resolveUriTemplatePath(request)
            uriTemplate?.also {
                meterRegistry.counter("http.status", "code", responseCode.toString(), "uri", uriTemplate).increment()
            }
        }
    }
}

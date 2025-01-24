package ai.whylabs.songbird.operations

import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpRequest
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import jakarta.inject.Inject
import org.reactivestreams.Publisher

@Filter("/**")
class ResponseHeaderFilter
@Inject constructor() : HttpServerFilter, JsonLogging {

    override fun doFilter(request: HttpRequest<*>, chain: ServerFilterChain): Publisher<MutableHttpResponse<*>> {
        val publisher = chain.proceed(request)
        return Publishers.then(publisher) {
            it.headers.add("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        }
    }
}

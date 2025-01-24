package ai.whylabs.songbird.operations

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.core.util.StringUtils
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.client.ProxyHttpClient
import io.micronaut.http.client.annotation.Client
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import io.micronaut.http.uri.UriBuilder
import io.reactivex.Flowable
import org.reactivestreams.Publisher
import java.net.URI

// Per https://micronaut-projects.github.io/micronaut-docs-mn2/2.1.0/guide/#proxyClient

@Filter("/scim/**")
class ScimProxyFilter(
    @Client("scim") private val client: ProxyHttpClient,
    private val config: EnvironmentConfig,
) : HttpServerFilter, JsonLogging {

    override fun doFilter(
        request: HttpRequest<*>,
        chain: ServerFilterChain
    ): Publisher<MutableHttpResponse<*>> {
        val scimServiceEndpoint = config.getScimServiceEndpoint()
        if (scimServiceEndpoint == null) {
            this.log.error("Please set the SCIM_SERVICE_API_ENDPOINT environment variable")
            return Publishers.just(
                HttpResponse.status<String>(HttpStatus.SERVICE_UNAVAILABLE).body("SCIM Service is not available")
            )
        }
        val scimUri = URI(scimServiceEndpoint)
        val scimPath = if (request.path == "/scim") "" else request.path.substring("/scim/".length)
        val reqMapper = request.mutate().uri { b: UriBuilder ->
            b.apply {
                scheme(scimUri.scheme)
                host(scimUri.host)
                port(scimUri.port)
                replacePath(
                    StringUtils.prependUri(
                        "/",
                        scimPath
                    )
                )
            }
        }
        val respMapper = { response: MutableHttpResponse<*> -> response }
        return Flowable.fromCallable { client.proxy(reqMapper) }
            .flatMap { proxyResult -> Publishers.map(proxyResult, respMapper) }
            .onErrorResumeNext { throwable: Throwable ->
                log.error("Error proxying to SCIM Service", throwable)
                Publishers.just(
                    HttpResponse.status<String>(HttpStatus.INTERNAL_SERVER_ERROR).body("Error connecting to SCIM Service")
                )
            }
    }
}

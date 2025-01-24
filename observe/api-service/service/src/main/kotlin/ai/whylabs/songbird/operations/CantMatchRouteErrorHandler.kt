package ai.whylabs.songbird.operations

import ai.whylabs.songbird.logging.JsonLogging
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.annotation.Produces
import io.micronaut.http.server.exceptions.ExceptionHandler
import jakarta.inject.Singleton

object CantMatchRouteException : RuntimeException("Route not recognized.")

@Produces
@Singleton
class CantMatchRouteExceptionHandler : ExceptionHandler<CantMatchRouteException, HttpResponse<Unit>>, JsonLogging {
    override fun handle(request: io.micronaut.http.HttpRequest<*>, exception: CantMatchRouteException): HttpResponse<Unit> {
        // We won't be able to tell the difference between a client requesting a retired endpoint and an auto generated
        // client requesting a path that doesn't exist because we made a change that broke it. We'll just have to be a little
        // smart when diagnosing this.
        val requestedPath = request.toString()
        val requestId = request.attributes.getValue(AuditLoggingFilter.RequestId)?.toString() ?: "unknown"
        log.warn("CantMatchRouteException $requestId : Request sent that couldn't be matched: $requestedPath")
        return HttpResponse.status(HttpStatus.NOT_FOUND)
    }
}

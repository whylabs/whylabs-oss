package ai.whylabs.songbird.operations

import ai.whylabs.songbird.NullablePubsubClient
import ai.whylabs.songbird.common.WhyLabsHeaders
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.security.IdentityType
import ai.whylabs.songbird.security.ValidatedIdentity
import ai.whylabs.songbird.security.WhyLabsInternal
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.google.protobuf.ByteString
import com.google.protobuf.Timestamp
import com.google.pubsub.v1.PubsubMessage
import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.util.NamedThreadFactory
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.http.HttpMethod
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.MutableHttpResponse
import io.micronaut.http.annotation.Filter
import io.micronaut.http.context.ServerRequestContext
import io.micronaut.http.filter.HttpServerFilter
import io.micronaut.http.filter.ServerFilterChain
import io.micronaut.http.filter.ServerFilterPhase
import io.micronaut.http.server.netty.NettyHttpRequest
import io.micronaut.security.authentication.Authentication
import io.micronaut.web.router.DefaultRouter
import io.micronaut.web.router.UriRouteMatch
import io.swagger.v3.oas.annotations.Operation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.asCoroutineDispatcher
import org.reactivestreams.Publisher
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors

/**
 * Annotation to mark APIs that are eligible for body capturing
 */
@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.VALUE_PARAMETER
)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class AuditableResponseBody

@Target(
    AnnotationTarget.CLASS,
    AnnotationTarget.FUNCTION,
    AnnotationTarget.VALUE_PARAMETER
)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class AuditableRequestBody

data class CallerIdentity(
    val type: String,
    val principalId: String,
    val identityId: String,
    val accountId: String,
    val invokedBy: String,
)

data class RequestParameters(
    val arguments: Map<String, String>,
    val requestBody: Any?,
)

// largely inspired https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference.html
data class AuditEntry(
    // likely just WhyLabsApiCall in Songbird
    val eventType: String,
    // version. For now 1.0
    val eventVersion: String,
    // Source of the event. Would be nice to know if it's from admins or from dashbird.
    val eventSource: String,
    // Name of the event (operation name in songbird)
    val eventName: String,
    // All the auth info
    val callerIdentity: CallerIdentity?,
    // Track source IP address
    val sourceIpAddress: String,
    // user agent string
    val userAgent: String,
    val requestParameters: RequestParameters?,
    // attempting to capture some response info
    val responseElements: Any?,
    // request ID if available (in Songbird we return the request ID in the header)
    val requestID: String,
    // event ID. UUID for Pubsub, basically
    val eventId: String,
    // if this is an internal API call done by WhyLabs
    val managedEvent: Boolean,
    // does this event modify the resource?
    val readOnly: Boolean,
    // the target organization ID here
    val targetAccountId: String?,
    // the user that the action is being performed on behalf of
    val onBehalfOf: String?,
    // the user that is impersonating the user via dashbird
    val impersonatedBy: String?,
    // status code
    val statusCode: Int,
)

private val IdentityTypes = setOf(IdentityType.User, IdentityType.ApiKey)
private val ReadOnlyHttpMethods = setOf(
    HttpMethod.GET, HttpMethod.HEAD, HttpMethod.OPTIONS, HttpMethod.TRACE
)

@Filter(Filter.MATCH_ALL_PATTERN)
class AuditLoggingFilter(
    private val publisher: NullablePubsubClient,
    private val defaultRouter: DefaultRouter,
    private val meterRegistry: MeterRegistry,
) : HttpServerFilter, JsonLogging {

    override fun doFilter(request: HttpRequest<*>, chain: ServerFilterChain): Publisher<MutableHttpResponse<*>> {
        return Publishers.then(chain.proceed(request)) {
            val req = ServerRequestContext.currentRequest<Any>().get()

            // log all the netty requests (they are different from the regular http requests for swagger/health endpoints)
            if (req is NettyHttpRequest<Any>) {
                val routeMatch = defaultRouter.route<Any, Any>(req.method, req.uri.toASCIIString())
                if (!routeMatch.isEmpty) {
                    try {
                        logRouteMatch(req, it, routeMatch.get())
                        meterRegistry.counter("Requests.Audit.Logged").increment()
                    } catch (e: Exception) {
                        log.warn {
                            msg("Failed to log request. Exception: ${e.message}")
                            exception(e)
                        }
                    }
                }
            }
        }
    }

    override fun getOrder(): Int {
        return ServerFilterPhase.TRACING.order()
    }

    private fun logRouteMatch(
        request: NettyHttpRequest<*>,
        response: HttpResponse<*>,
        routeMatch: UriRouteMatch<*, *>
    ) {
        if (publisher.isEmpty) {
            log.debugMsg { "Skip Pubsub audit logging" }
            return
        }

        val parameters = routeMatch.variableValues.entries.filter { e -> e.value is String }
            .associate { e -> Pair(e.key, e.value as String) }

        // look up the OpenAPI annotations among all annotations of the controller class and the method
        val allAnnotations =
            routeMatch.target.javaClass.annotations.toList() + routeMatch.targetMethod.annotations.toList()
        val operationAnnotation = allAnnotations.filterIsInstance<Operation>().getOrNull(0)
        val managedEvent = allAnnotations.filterIsInstance<WhyLabsInternal>().isNotEmpty()
        val eventName = operationAnnotation?.operationId ?: routeMatch.route.uriMatchTemplate.toPathString()
        if (eventName == "/health" || eventName.startsWith("/swagger")) {
            return
        }

        val authInfo = request.attributes.getValue(MicronautAuthentication) as Authentication?

        val eventId = UUID.randomUUID().toString()
        val requestBody = if (routeMatch.hasAnnotation(AuditableRequestBody::class.java)) request.body else null
        val responseBody = if (routeMatch.hasAnnotation(AuditableResponseBody::class.java)) response.body.orElse(null) else null
        val validatedIdentity = authInfo?.attributes?.get("key") as ValidatedIdentity?

        // For all secured calls, there will be a validated identity
        val callerIdentity = validatedIdentity?.let { i ->
            if (validatedIdentity.principalId.startsWith("arn:aws:sts")) {
                // This is a trusted service call. The principalId is the ARN of the service, and the orgId will be "0".
                CallerIdentity(
                    type = IdentityType.WhyLabsService.name,
                    principalId = validatedIdentity.principalId,
                    accountId = validatedIdentity.orgId,
                    identityId = validatedIdentity.identityId,
                    invokedBy = "trusted_service"
                )
            } else {
                // If it's an API key, the caller identity is determined by the validated identity. Note that for
                //  special super admin keys, the accountId is set to the super admin orgId "0", which is not the same
                //  as the target org.
                CallerIdentity(
                    type = i.type.name,
                    principalId = i.principalId,
                    accountId = validatedIdentity.orgId,
                    identityId = i.identityId,
                    invokedBy = if (IdentityTypes.contains(i.type)) "user" else "whylabs.ai"
                )
            }
        }

        val sourceIpAddress: String = if (validatedIdentity?.principalId?.startsWith("arn:aws:sts") == true) {
            request.headers[WhyLabsHeaders.WhyLabsUserIPHeader] ?: request.headers["X-Forwarded-For"] ?: request.remoteAddress.hostString
        } else {
            request.headers["X-Forwarded-For"] ?: request.remoteAddress.hostString
        }

        val impersonator: String? = if (validatedIdentity?.principalId?.startsWith("arn:aws:sts") == true) {
            request.headers[WhyLabsHeaders.WhyLabsImpersonatorHeader]
        } else {
            null
        }

        val auditEntry = AuditEntry(
            statusCode = response.code(),
            eventType = "WhyLabsApiCall",
            eventId = eventId,
            eventName = eventName,
            eventVersion = "1.0",
            callerIdentity = callerIdentity,
            eventSource = "unknown",
            sourceIpAddress = sourceIpAddress,
            requestParameters = RequestParameters(
                arguments = parameters,
                requestBody = requestBody,
            ),
            targetAccountId = getTargetOrganizationId() ?: "unknown",
            userAgent = request.headers["User-Agent"] ?: "unknown",
            responseElements = responseBody,
            requestID = request.attributes.getValue(RequestId)?.toString() ?: "unknown",
            readOnly = ReadOnlyHttpMethods.contains(request.method),
            managedEvent = managedEvent,
            onBehalfOf = getRequestUserId() ?: "unknown",
            impersonatedBy = impersonator ?: "unknown",
        )
        val contentBody = mapper.writeValueAsString(auditEntry)

        val now = Instant.now()
        val msg = PubsubMessage.newBuilder()
            .setMessageId(eventId)
            .setPublishTime(Timestamp.newBuilder().setSeconds(now.epochSecond).setNanos(now.nano))
            .setData(ByteString.copyFromUtf8(contentBody))
            .build()

        log.debug("Pubsub message: {}", msg)

        // do not block the thread while attempting publishing to Pubsub. Also make this code really threadsafe
        dispatcher.dispatch(Dispatchers.IO) {
            try {
                publisher.get().publish(msg)
            } catch (e: Exception) {
                log.warn {
                    msg("Failed to emit log to Google Pubsub. Exception message: ${e.message}")
                    exception(e)
                }
            }
        }
    }

    companion object {
        const val RequestId = "X-Request-Id"
        const val MicronautAuthentication = "micronaut.AUTHENTICATION"
        private val mapper = jacksonObjectMapper()
        val dispatcher =
            Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors(),
                NamedThreadFactory("AuditLogger-"),
            )
                .asCoroutineDispatcher() // (1) <-- main process runs indefinitely w/o closing dispatcher1 (3)
    }
}

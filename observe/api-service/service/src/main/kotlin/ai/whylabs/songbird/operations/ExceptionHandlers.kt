package ai.whylabs.songbird.operations

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.monitor.MonitorConfigValidationException
import ai.whylabs.songbird.monitor.SchemaValidationException
import com.amazonaws.AmazonServiceException
import io.micrometer.core.instrument.MeterRegistry
import io.micrometer.core.instrument.Tag
import io.micronaut.context.annotation.Requirements
import io.micronaut.context.annotation.Requires
import io.micronaut.http.HttpRequest
import io.micronaut.http.HttpResponse
import io.micronaut.http.HttpStatus
import io.micronaut.http.annotation.Produces
import io.micronaut.http.server.exceptions.ExceptionHandler
import jakarta.inject.Singleton
import org.slf4j.MDC

data class BadRequestResponse(
    val message: String,
    val requestId: String,
    val type: String,
)

data class BadParameterResponse(
    val message: String,
    val requestId: String,
    val type: String,
    val parameter: String,
)

data class ResourceMessage(
    val message: String,
    val requestId: String,
    val type: String,
)

data class InternalErrorResponse(
    val message: String,
    val requestId: String,
    val type: String = "Internal",
)

abstract class BaseExceptionHandler<T : Throwable> :
    ExceptionHandler<T, HttpResponse<*>>,
    JsonLogging {
    private fun addMdcContext(
        request: HttpRequest<*>,
        exception: Throwable,
    ): Pair<String, String> {
        val requestId = request.xRequestId() ?: "unknown-request-id"
        val shortClassName = exception::class.simpleName!!.replace("Exception", "")

        MDC.put("requestId", requestId)
        MDC.put("exceptionClass", exception::class.simpleName)
        MDC.put("path", request.path)
        MDC.put("parameters", request.parameters.joinToString(",") { "${it.key}=${it.value}" })
        MDC.put(
            "headers",
            request.headers
                .filter { !it.key.equals("Cookie", true) }
                .filter { !it.key.equals("X-Api-Key", true) }
                .joinToString(",") { "${it.key}=${it.value}" }
        )
        return Pair(requestId, shortClassName)
    }

    final override fun handle(request: HttpRequest<*>, exception: T): HttpResponse<*> {
        val copyOfContextMap = MDC.getCopyOfContextMap()
        try {
            val (requestId, shortClassName) = addMdcContext(request, exception)

            return doHandle(requestId, shortClassName, exception)
        } finally {
            MDC.setContextMap(copyOfContextMap)
        }
    }

    abstract fun doHandle(requestId: String, shortClassName: String, exception: T): HttpResponse<*>
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [IllegalArgumentException::class, ExceptionHandler::class])
)
class IllegalArgumentExceptionHandler : BaseExceptionHandler<IllegalArgumentException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: IllegalArgumentException,
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Handled illegal argument exception: ${error.message}" }
        }

        return HttpResponse.badRequest(error)
    }
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [ArgumentValueException::class, ExceptionHandler::class])
)
class ArgumentValueExceptionHandler : BaseExceptionHandler<ArgumentValueException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: ArgumentValueException,
    ): HttpResponse<*> {
        val error = BadParameterResponse(exception.message!!, requestId, shortClassName, exception.parameter)
        log.info {
            msg { "Handled invalid argument value exception: ${error.message}" }
        }

        return HttpResponse.badRequest(error)
    }
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [FeatureUnauthorizedException::class, ExceptionHandler::class])
)
class FeatureUnauthorizedExceptionHandler : BaseExceptionHandler<FeatureUnauthorizedException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: FeatureUnauthorizedException,
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Handled feature unauthorized exception: ${error.message}" }
        }

        return HttpResponse.badRequest(error)
    }
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [SchemaValidationException::class, ExceptionHandler::class])
)
class SchemaValidationExceptionHandler : BaseExceptionHandler<SchemaValidationException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: SchemaValidationException,
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Handled schema validation exception: ${error.message}" }
        }

        return HttpResponse.badRequest(error)
    }
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [MonitorConfigValidationException::class, ExceptionHandler::class])
)
class MonitorConfigValidationExceptionHandler : BaseExceptionHandler<MonitorConfigValidationException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: MonitorConfigValidationException,
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Handled monitor config validation exception: ${error.message}" }
        }

        return HttpResponse.badRequest(error)
    }
}

@Produces
@Singleton
@Requirements(
    Requires(classes = [PermanentlyRemovedException::class, ExceptionHandler::class])
)
class PermanentlyRemovedExceptionHandler : BaseExceptionHandler<PermanentlyRemovedException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: PermanentlyRemovedException,
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Permanently removed: ${error.message}" }
        }

        return HttpResponse.status<String>(HttpStatus.GONE).body(error)
    }
}

@Produces
@Singleton
@Requirements(Requires(classes = [ResourceAlreadyExistsException::class, ExceptionHandler::class]))
class ResourceAlreadyExistsExceptionHandler : BaseExceptionHandler<ResourceAlreadyExistsException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: ResourceAlreadyExistsException
    ): HttpResponse<*> {
        val error = ResourceMessage(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Exception handling resource: ${error.message}" }
        }

        return HttpResponse.status<String>(HttpStatus.CONFLICT).body(error)
    }
}

@Produces
@Singleton
@Requirements(Requires(classes = [ResourceException::class, ExceptionHandler::class]))
class ResourceExceptionHandler : BaseExceptionHandler<ResourceException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: ResourceException,
    ): HttpResponse<*> {
        val error = ResourceMessage(exception.message!!, requestId, shortClassName)
        log.info {
            msg { "Exception handling resource: ${error.message}" }
        }

        return HttpResponse.notFound(error)
    }
}

/**
 * We don't expose Amazon SDK exception to callers for security reasons.
 */
@Produces
@Singleton
@Requirements(Requires(classes = [AmazonServiceException::class, ExceptionHandler::class]))
class AmazonServiceExceptionHandler(private val meterRegistry: MeterRegistry) :
    BaseExceptionHandler<AmazonServiceException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: AmazonServiceException,
    ): HttpResponse<*> {
        val error = InternalErrorResponse(
            "Internal error. Unable to process request",
            requestId,
            "Internal"
        )
        log.error {
            msg { "AWSError" }
            meta(
                "awsServiceName" to exception.serviceName,
                "awsRequestId" to exception.requestId,
                "statusCode" to exception.statusCode.toString(),
                "type" to exception.errorType.name,
                "code" to exception.errorCode,
                "message" to exception.errorMessage,
            )
        }

        meterRegistry.counter("aws.exception", listOf(Tag.of("ServiceName", exception.serviceName))).increment()

        return HttpResponse.serverError(error)
    }
}

@Produces
@Singleton
@Requirements(Requires(classes = [NotImplementedException::class, ExceptionHandler::class]))
class NotImplementedExceptionHandler : BaseExceptionHandler<NotImplementedException>() {
    override fun doHandle(
        requestId: String,
        shortClassName: String,
        exception: NotImplementedException
    ): HttpResponse<*> {
        val error = BadRequestResponse(exception.message!!, requestId, shortClassName)
        log.warn {
            msg { "Call to not implemented API: ${error.message}" }
        }
        return HttpResponse.status<String>(HttpStatus.NOT_IMPLEMENTED).body(error)
    }
}

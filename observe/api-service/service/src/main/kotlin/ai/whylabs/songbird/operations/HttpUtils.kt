package ai.whylabs.songbird.operations

import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestUserId
import ai.whylabs.songbird.operations.TracingFilter.Companion.MicronautAuthentication
import ai.whylabs.songbird.operations.TracingFilter.Companion.MicronautAuthenticationAttributeKey
import ai.whylabs.songbird.operations.TracingFilter.Companion.RequestId
import ai.whylabs.songbird.security.ValidatedIdentity
import io.micronaut.http.HttpRequest
import io.micronaut.http.context.ServerRequestContext
import io.micronaut.security.authentication.Authentication

fun HttpRequest<*>.xRequestId(): String? {
    return this.attributes.getValue(RequestId) as String?
}

fun HttpRequest<*>.micronautAuthentication(): Authentication? {
    return this.attributes.getValue(MicronautAuthentication) as Authentication?
}

fun getValidatedIdentity(): ValidatedIdentity? {
    return ServerRequestContext.currentRequest<Any>().map {
        it.micronautAuthentication()?.attributes?.get(MicronautAuthenticationAttributeKey) as? ValidatedIdentity?
    }.orElse(null)
}

fun getTargetOrganizationId(): String? {
    return getRequestAttribute(RequestOrganizationId) as String?
}

fun getRequestUserId(): String? {
    return getRequestAttribute(RequestUserId) as String?
}

fun getRequestAttribute(attribute: String): Any? {
    return ServerRequestContext.currentRequest<Any>().map { it.attributes.getValue(attribute) }
        .orElse(null)
}

fun setRequestAttribute(attribute: String, value: String) {
    val req = ServerRequestContext.currentRequest<Any>().orElse(null)
    req?.setAttribute(attribute, value)
}

fun getCurrentRequestId(): String? {
    return ServerRequestContext.currentRequest<Any>().map { it.xRequestId() }.orElse(null)
}

fun getHeader(header: String): String? {
    return ServerRequestContext.currentRequest<Any>().map { it.headers.get(header) }.orElse(null)
}

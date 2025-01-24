package ai.whylabs.songbird.security

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestUserId
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsOrganizationHeader
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsUserHeader
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.CantMatchRouteException
import ai.whylabs.songbird.operations.getTargetOrganizationId
import ai.whylabs.songbird.security.SecurityValues.WhyLabsAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.security.SecurityValues.resolveOrgFromUri
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import io.micrometer.core.instrument.MeterRegistry
import io.micronaut.core.async.publisher.Publishers
import io.micronaut.core.order.Ordered
import io.micronaut.http.HttpRequest
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.Authentication
import io.micronaut.security.rules.AbstractSecurityRule
import io.micronaut.security.rules.SecurityRule
import io.micronaut.security.rules.SecurityRuleResult
import io.micronaut.security.token.RolesFinder
import io.micronaut.web.router.MethodBasedRouteMatch
import io.micronaut.web.router.RouteMatch
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.reactivestreams.Publisher

/**
 * Relies on organization id in the REST API path to validate a token against a request.
 */
@Singleton
class OrganizationIdSecurityRule @Inject constructor(
    rolesFinder: RolesFinder?,
    private val meterRegistry: MeterRegistry,
    private val config: EnvironmentConfig,
    private val organizationDAO: OrganizationDAO,
) : AbstractSecurityRule(rolesFinder),
    JsonLogging {
    val OrgId = "OrgId" // metric tag key

    private fun extractHeader(header: HttpRequest<*>?, name: String): String? {
        try {
            return header?.headers?.get(name)
        } catch (e: ClassCastException) {
            // This happens in the test framework, should not happen for real
            log.error("Failed to extract request header ID $name due to class cast exception")
            return null
        }
    }
    override fun check(
        request: HttpRequest<*>?,
        routeMatch: RouteMatch<*>?,
        authentication: Authentication?
    ): Publisher<SecurityRuleResult> {

        // Set up user id attribute for trusted services and superadmins
        if (isSuperAdmin(authentication)) {
            val recipientUserId = extractHeader(request, WhyLabsUserHeader)
            if (recipientUserId != null) {
                request?.setAttribute(RequestUserId, recipientUserId)
            }
        }

        when {
            // If a request intends to call an api (header present) and it isn't matched then return 404
            // The alternative to this is a path.contains("/v0") which seems needlessly expensive for a check
            // that happens on every request
            routeMatch == null && (request?.headers?.contains(ApiKeyHeader) == true) -> {
                log.debug("Route not recognized.")
                throw CantMatchRouteException
            }

            routeMatch !is MethodBasedRouteMatch<*, *> -> {
                log.debug("Don't know how to determine security for api.")
                meterRegistry.counter("Auth.UnknownPath").increment()
                return Publishers.just(SecurityRuleResult.UNKNOWN)
            }

            // skip full organization check for internal APIs
            routeMatch.hasAnnotation(WhyLabsInternal::class.java) -> {
                log.debug("Determining security via @WhyLabsInternal annotation")
                return checkInternal(authentication, request).also {
                    log.debug("Determining security via @Secured annotation as $it")
                }.let { Publishers.just(it) }
            }
            // Admin APIs
            routeMatch.hasAnnotation(AdminSecured::class.java) -> {
                log.debug("Determining security via @AdminSecured annotation")
                return checkAdminSecured(authentication, request).also {
                    log.debug("Determining security via @Secured annotation as $it")
                }.let { Publishers.just(it) }
            }

            routeMatch.hasAnnotation(Secured::class.java) -> {
                @Suppress("UNCHECKED_CAST")
                return checkSecured(
                    authentication,
                    request,
                    routeMatch.getValue(Secured::class.java).orElse(null) as? Array<String>
                ).also {
                    log.debug("Determining security via @Secured annotation as $it")
                }.let { Publishers.just(it) }
            }

            else -> return Publishers.just(SecurityRuleResult.UNKNOWN)
        }
    }

    private fun baseCheckSecured(authentication: Authentication?, request: HttpRequest<*>?, isAdmin: Boolean): SecurityRuleResult {
        if (authentication?.attributes == null || authentication.attributes[Claims.Organization] == null) {
            meterRegistry.counter("Auth.InvalidClaims").increment()
            return SecurityRuleResult.REJECTED
        }
        val claimOrgId = authentication.attributes[Claims.Organization] as String
        val pathUri = request?.path
        val isV1Route = (pathUri?.startsWith("/v1/") == true)

        if (isV1Route) {
            meterRegistry.counter("Auth.V1Route").increment()
            if (isSuperAdmin(authentication)) {
                // v1 routes for superadmins & trusted services will use the RequestOrganizationId set from the header
                val recipientAccountId = extractHeader(request, WhyLabsOrganizationHeader)
                if (recipientAccountId != null) {
                    request?.setAttribute(RequestOrganizationId, recipientAccountId)
                } else {
                    // For local debug only, we set the superadmin target org based on the claimOrgId
                    if (config.isAuthorizationDisabled()) {
                        request?.setAttribute(RequestOrganizationId, claimOrgId)
                    }
                    // in all other cases, superadmin must set org header to be able to use v1 routes that rely on
                    // an implicit org id in the API key
                }

                // No further processing is needed for superadmins
                meterRegistry.counter("Auth.SuperAdmin").increment()
                return SecurityRuleResult.UNKNOWN
            } else {
                // API keys for the parent org and make calls to child orgs by passing the child org id in the header
                val headerOrgId = extractHeader(request, WhyLabsOrganizationHeader)
                if (!headerOrgId.isNullOrBlank() && claimOrgId != headerOrgId) {
                    val managedOrganizations = organizationDAO.listManagedOrganizations(claimOrgId)
                    val childOrg = managedOrganizations.find { it.id == headerOrgId }
                    if (childOrg?.id == headerOrgId) {
                        request?.setAttribute(RequestOrganizationId, headerOrgId)
                    } else {
                        meterRegistry.counter("Auth.V1Route.ManagedOrgRejected").increment()
                        return SecurityRuleResult.REJECTED
                    }
                } else {
                    // v1 routes for non-superadmins are applied to the org id in the token
                    request?.setAttribute(RequestOrganizationId, claimOrgId)
                }
            }
        } else {
            // it's a v0 route
            meterRegistry.counter("Auth.V0Route").increment()

            // v0 routes are applied to the org id in the path, if any
            val matchResult = resolveOrgFromUri(pathUri ?: "")
            val pathOrgId = matchResult?.destructured?.component1()
            request?.setAttribute(RequestOrganizationId, pathOrgId)

            // superadmin can use any pathOrgId with a v0 route, and routes with no org associated to them
            if (isSuperAdmin(authentication)) {
                meterRegistry.counter("Auth.SuperAdmin").increment()
                return SecurityRuleResult.UNKNOWN
            }
            // otherwise there must be a pathOrgId and it must match the claimOrgId
            if (pathOrgId != claimOrgId) {
                meterRegistry.counter("Auth.Org.Rejected", OrgId, pathOrgId).increment()
                return SecurityRuleResult.REJECTED
            }
        }

        // we've established the target org id, now check required roles
        val targetOrgId: String? = getTargetOrganizationId()
        if (isAdmin) {
            val roles = authentication.roles ?: setOf()
            if (roles.contains(SecurityValues.AdministratorRole)) {
                meterRegistry.counter("Auth.Admin.Unknown", OrgId, targetOrgId).increment()
                return SecurityRuleResult.UNKNOWN
            } else {
                meterRegistry.counter("Auth.Admin.Rejected", OrgId, targetOrgId).increment()
                return SecurityRuleResult.REJECTED
            }
        }

        meterRegistry.counter("Auth.Org.Unknown", OrgId, targetOrgId).increment()
        return SecurityRuleResult.UNKNOWN
    }

    private fun isSuperAdmin(
        authentication: Authentication?,
    ): Boolean {
        val roles = authentication?.roles ?: setOf<String>()
        return roles.contains(WhyLabsAdministratorRole) || roles.contains(WhyLabsSystemRole)
    }

    private fun checkInternal(
        authentication: Authentication?,
        request: HttpRequest<*>?
    ): SecurityRuleResult {
        if (!isSuperAdmin(authentication)) {
            meterRegistry.counter("Auth.Internal.Rejected").increment()
            return SecurityRuleResult.REJECTED
        }
        return baseCheckSecured(authentication, request, false)
    }

    private fun checkSecured(
        authentication: Authentication?,
        request: HttpRequest<*>?,
        secureAnnotationValues: Array<String>?,
    ): SecurityRuleResult {
        if (secureAnnotationValues?.contains(SecurityRule.IS_ANONYMOUS) == true) {
            // We don't know the target org at this point - the endpoint must set RequestOrganizationId if relevant
            meterRegistry.counter("Auth.Anonymous").increment()
            return SecurityRuleResult.UNKNOWN
        }

        return baseCheckSecured(authentication, request, false)
    }

    private fun checkAdminSecured(
        authentication: Authentication?,
        request: HttpRequest<*>?,
    ): SecurityRuleResult {
        return baseCheckSecured(authentication, request, true)
    }

    override fun getOrder(): Int {
        return Ordered.HIGHEST_PRECEDENCE
    }
}

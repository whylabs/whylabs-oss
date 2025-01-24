package ai.whylabs.songbird.security

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.common.WhyLabsAttributes.RequestOrganizationId
import ai.whylabs.songbird.common.WhyLabsHeaders.WhyLabsOrganizationHeader
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSuperAdminOrgId
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.v0.dao.OrganizationDAO
import ai.whylabs.songbird.v0.dao.OrganizationSummary
import io.kotest.matchers.shouldBe
import io.micrometer.core.instrument.MeterRegistry
import io.micronaut.http.HttpRequest
import io.micronaut.security.annotation.Secured
import io.micronaut.security.authentication.ServerAuthentication
import io.micronaut.security.rules.SecurityRuleResult
import io.micronaut.security.token.RolesFinder
import io.micronaut.web.router.BasicObjectRouteMatch
import io.micronaut.web.router.MethodBasedRouteMatch
import io.mockk.called
import io.mockk.clearAllMocks
import io.mockk.confirmVerified
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.reactive.awaitFirst
import kotlinx.coroutines.reactive.collect
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.extension.ExtendWith
import java.util.Optional

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockKExtension::class)
internal class OrganizationIdSecurityRuleTest {
    @RelaxedMockK
    private lateinit var rolesFinder: RolesFinder

    @RelaxedMockK
    private lateinit var metersRegistry: MeterRegistry

    @RelaxedMockK
    private lateinit var config: EnvironmentConfig

    @RelaxedMockK
    private lateinit var organizationDAO: OrganizationDAO

    @RelaxedMockK
    private lateinit var request: HttpRequest<*>

    @RelaxedMockK
    private lateinit var routeMatch: MethodBasedRouteMatch<*, *>

    private val orgRule by lazy {
        OrganizationIdSecurityRule(rolesFinder, metersRegistry, config, organizationDAO)
    }

    private val superadminOrgClaim = mapOf(Claims.Organization to WhyLabsSuperAdminOrgId)
    private val testOrgClaim = mapOf(
        Claims.Organization to "org-123",
    )

    @BeforeEach
    fun setup() {
        clearAllMocks()
        every { routeMatch.hasAnnotation(any<Class<*>>()) }.returns(false)
    }

    @Test
    fun `should let non method-based route match requests pass`() = runBlocking {
        val routeMatch = mockk<BasicObjectRouteMatch>()
        orgRule.check(request, routeMatch, null).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN
        verify { routeMatch wasNot called }
    }

    @Test
    fun `should reject WhyLabsInternal if roles are missing`() = runBlocking {
        every { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }.returns(true)
        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(), testOrgClaim)).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 0) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should let WhyLabsInternal if role contains WhyLabsAdministrator`() = runBlocking {
        every { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }.returns(true)
        orgRule.check(request, routeMatch, ServerAuthentication("test", setOf(WhyLabsAdministratorRole), superadminOrgClaim)).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 0) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should let WhyLabsInternal if role contains WhyLabsSystemRole`() = runBlocking {
        every { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }.returns(true)
        orgRule.check(request, routeMatch, ServerAuthentication("test", setOf(WhyLabsSystemRole), superadminOrgClaim)).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 0) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject AdminSecured without claims`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)

        orgRule.check(request, routeMatch, ServerAuthentication("test", null, null)).collect { it shouldBe SecurityRuleResult.REJECTED }

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject Secured with empty claims`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))

        orgRule.check(request, routeMatch, ServerAuthentication("test", setOf(UserRole), mapOf())).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should let unmatched requests pass`() = runBlocking {
        orgRule.check(request, routeMatch, null).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject AdminSecured requests without claim organization ID`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(WhyLabsAdministratorRole), mapOf())).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject Secured requests without claim organization ID`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(UserRole), mapOf())).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should let AdminSecured requests WhyLabs system pass`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)
        every { request.path }.returns("/v0/organizations/org-123")

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(WhyLabsSystemRole), mapOf(Claims.Organization to WhyLabsSuperAdminOrgId))
        ).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        confirmVerified(routeMatch)
    }

    @Test
    fun `should let Secured requests WhyLabs system pass`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(WhyLabsSystemRole), mapOf(Claims.Organization to WhyLabsSuperAdminOrgId))
        ).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject AdminSecured requests with mismatched orgIds`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)
        every { request.path }.returns("/v0/organizations/org-345")

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(SecurityValues.AdministratorRole), mapOf(Claims.Organization to "org-123"))).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { request.path }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject Secured requests with mismatched orgIds`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { request.path }.returns("/v0/organizations/org-345")
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(SecurityValues.UserRole), mapOf(Claims.Organization to "org-123"))).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { request.path }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should handle invalid Secured path`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { request.path }.returns("/v0/something/else")
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(SecurityValues.UserRole), mapOf(Claims.Organization to "org-123"))).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { request.path } // logger calls to this method
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should let Secure requests pass when organization IDs match`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))
        every { request.path }.returns("/v0/organizations/org-123")

        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(), mapOf(Claims.Organization to "org-123"))).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }
        verify(exactly = 1) { request.path }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-123") }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should reject @AdminSecure requests when orgId match but role is not admin`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)
        every { request.path }.returns("/v0/organizations/org-123")
        val claims = mapOf(
            Claims.Organization to "org-123",
        )
        orgRule.check(request, routeMatch, ServerAuthentication("test", listOf(SecurityValues.UserRole), claims)).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 0) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { request.path }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-123") }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should allow @AdminSecure requests when orgId match and role is admin`() = runBlocking {
        every { routeMatch.hasAnnotation(AdminSecured::class.java) }.returns(true)
        every { request.path }.returns("/v0/organizations/org-123")

        val claims = mapOf(
            Claims.Organization to "org-123",
        )
        orgRule.check(request, routeMatch, ServerAuthentication("test", setOf(AdministratorRole), claims)).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 0) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-123") }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should let Secured requests with WhyLabs organization ID pass v1`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))
        every { request.path }.returns("/v1/test")

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(), mapOf(Claims.Organization to "org-random"))
        ).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-random") }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should NOT let Secured override Org ID in v1 for normal users`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))
        every { request.path }.returns("/v1/test")
        every { organizationDAO.listManagedOrganizations("org-random") }.returns(emptyList())

        // try to override the org ID
        every { request.headers.get(WhyLabsOrganizationHeader) }.returns("org-target")

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(), mapOf(Claims.Organization to "org-random"))
        ).awaitFirst() shouldBe SecurityRuleResult.REJECTED

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should ALLOW Secured override Org ID in v1 for parent org users`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))
        every { request.path }.returns("/v1/test")
        every { organizationDAO.listManagedOrganizations("org-random") }.returns(
            listOf(
                OrganizationSummary(
                    id = "org-target",
                    name = "org-target is a child organization of org-random",
                    null,
                    null,
                    null,
                    null,
                    null,
                )
            )
        )

        // try to override the org ID
        every { request.headers.get(WhyLabsOrganizationHeader) }.returns("org-target")

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(), mapOf(Claims.Organization to "org-random"))
        ).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-target") }

        confirmVerified(routeMatch)
    }

    @Test
    fun `should  ALLOW SuperAdmin to override Org ID in v1`() = runBlocking {
        every { routeMatch.hasAnnotation(Secured::class.java) }.returns(true)
        every { routeMatch.getValue(Secured::class.java) }.returns(Optional.of(emptyArray<String>() as Any))
        every { request.path }.returns("/v1/test")

        // try to override the org ID
        every { request.headers.get(WhyLabsOrganizationHeader) }.returns("org-target")

        orgRule.check(
            request,
            routeMatch,
            ServerAuthentication("test", listOf(WhyLabsSystemRole), mapOf(Claims.Organization to WhyLabsSuperAdminOrgId))
        ).awaitFirst() shouldBe SecurityRuleResult.UNKNOWN

        verify(exactly = 1) { routeMatch.hasAnnotation(WhyLabsInternal::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(AdminSecured::class.java) }
        verify(exactly = 1) { routeMatch.hasAnnotation(Secured::class.java) }
        verify(exactly = 1) { routeMatch.getValue(Secured::class.java) }
        verify(exactly = 1) { request.setAttribute(RequestOrganizationId, "org-target") }

        confirmVerified(routeMatch)
    }
}

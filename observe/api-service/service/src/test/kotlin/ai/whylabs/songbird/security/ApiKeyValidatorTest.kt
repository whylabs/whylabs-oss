package ai.whylabs.songbird.security

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.cache.ApiKeyUsageCache
import ai.whylabs.songbird.security.SecurityValues.AccountAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.AdministratorRole
import ai.whylabs.songbird.security.SecurityValues.AuthenticatedRole
import ai.whylabs.songbird.security.SecurityValues.ExternalRoleScopes
import ai.whylabs.songbird.security.SecurityValues.SecureContainerRole
import ai.whylabs.songbird.security.SecurityValues.UserRole
import ai.whylabs.songbird.security.SecurityValues.UserScope
import ai.whylabs.songbird.security.SecurityValues.WhyLabsAdministratorRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsAdministratorScope
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSuperAdminOrgId
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemScope
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.v0.dao.ApiKeyDAO
import ai.whylabs.songbird.v0.dao.ApiKeyItem
import ai.whylabs.songbird.v0.ddb.ApiUserKey
import ai.whylabs.songbird.v0.ddb.OrgKey
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldContainExactlyInAnyOrder
import io.kotest.matchers.maps.shouldBeEmpty
import io.kotest.matchers.maps.shouldContain
import io.kotest.matchers.maps.shouldNotBeEmpty
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldHaveLength
import io.kotest.matchers.string.shouldStartWith
import io.mockk.called
import io.mockk.clearAllMocks
import io.mockk.confirmVerified
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import kotlinx.coroutines.reactive.awaitFirst
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime
import java.time.ZoneOffset

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockKExtension::class)
internal class ApiKeyValidatorTest {
    @RelaxedMockK
    private lateinit var config: EnvironmentConfig

    @RelaxedMockK
    private lateinit var dao: ApiKeyDAO

    @RelaxedMockK
    private lateinit var awsIdentityValidator: AWSIdentityValidator

    @RelaxedMockK
    private lateinit var apiKeyUsageCache: ApiKeyUsageCache

    private val validator by lazy {
        ApiKeyValidator(config, dao, awsIdentityValidator, apiKeyUsageCache)
    }

    @BeforeEach
    fun setup() {
        clearAllMocks()
        every { config.isAuthorizationDisabled() }.returns(false)
    }

    @Test
    fun `always validates if authZ is disabled`() = runBlocking {
        every { config.isAuthorizationDisabled() }.returns(true)
        val res = validator.validateToken(null, null).awaitFirst()

        res.name.shouldBe("localUser")
        res.attributes.shouldContain(Claims.Organization, "org-0")
    }

    @Test
    fun `returns anonymous when api key is missing`() = runBlocking {
        val res = validator.validateToken(null, null).awaitFirst()

        res.name.shouldBe("anonymous")
        res.attributes.shouldBeEmpty()

        verify(exactly = 1) { config.isAuthorizationDisabled() }
        verify { dao wasNot called }
        confirmVerified(config)
        confirmVerified(dao)
    }

    @Test
    fun `returns anonymous when key hash not present in the DAO`() = runBlocking {
        val testKey = ApiKey.generateKey()
        val hash = testKey.toHash()
        every { dao.load(hash) }.returns(null)

        val validator = ApiKeyValidator(config, dao, awsIdentityValidator, apiKeyUsageCache)
        val res = validator.validateToken(testKey.toString(), null).awaitFirst()

        res.name.shouldBe("anonymous")
        res.attributes.shouldBeEmpty()

        verify(exactly = 1) { config.isAuthorizationDisabled() }
        verify(exactly = 1) { dao.load(hash) }
        confirmVerified(config)
        confirmVerified(dao)
    }

    @Test
    fun `returns user authentication if key is found`() = runBlocking {
        val testKey = ApiKey.generateKey()
        val hash = testKey.toHash()
        every { dao.load(hash) }.returns(
            ApiKeyItem(
                orgKey = OrgKey("org-123"),
                userKey = ApiUserKey("org-123", "user-123"),
                keyHash = hash,
                keyId = testKey.id,
                scopes = setOf(":user")
            )
        )

        val authentication = validator.validateToken(testKey.toString(), null).awaitFirst()

        authentication.name.shouldBe("user-123")
        authentication.attributes.shouldNotBeEmpty()
        authentication.attributes.shouldContain(Claims.Roles, setOf(UserRole, AuthenticatedRole))
        authentication.attributes.shouldContain(Claims.Scopes, setOf(UserScope))
        authentication.attributes.shouldContain(Claims.Organization, "org-123")

        verify(exactly = 1) { config.isAuthorizationDisabled() }
        verify(exactly = 1) { dao.load(hash) }

        confirmVerified(config)
        confirmVerified(dao)
    }

    @Test
    fun `it should uses AWSIdentityValidator when key is a json`() = runBlocking {
        val testApiKey = ValidatedIdentity(IdentityType.WhyLabsOperator, "0", "test", "demo", null, null, setOf(), setOf())
        every { awsIdentityValidator.validate("{}") }.returns(testApiKey)
        val validator = ApiKeyValidator(config, dao, awsIdentityValidator, apiKeyUsageCache)

        val authentication = validator.validateToken("{}", null).awaitFirst()

        verify { dao wasNot called }

        authentication.name.shouldBe("test")
        authentication.attributes.shouldContain("organization", "0")
        authentication.attributes.shouldContain("expirationTime", null)
        authentication.attributes.shouldContain("key", testApiKey)
        authentication.attributes.shouldContain("scopes", setOf<String>())

        confirmVerified(dao)
    }
}

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
internal class ValidatedApiKeyTest {
    private val now = LocalDateTime.of(2020, 11, 1, 0, 0).atZone(ZoneOffset.UTC).toInstant()
    val orgId = "org-123"
    val userId = "user-123"
    val keyId = "keyId"
    private val validKey = ApiKeyItem(
        orgKey = OrgKey(orgId),
        userKey = ApiUserKey(orgId, userId),
        keyHash = "keyHash",
        keyId = keyId,
    )

    @Test
    fun `returns null if key has expired`() {
        val expiredKey = ApiKeyItem(expirationTime = now.minusMillis(1).toDate())
        ValidatedIdentity.validate(expiredKey, now).shouldBeNull()
    }

    @Test
    fun `returns null if key is revoked`() {
        val revokedKey = validKey.copy(isRevoked = true)
        ValidatedIdentity.validate(revokedKey, now).shouldBeNull()
    }

    @Test
    fun `returns valid key if key's revoked status is not set`() {
        val unrevokedKey = validKey.copy(isRevoked = null)
        ValidatedIdentity.validate(unrevokedKey, now).shouldNotBeNull()
    }

    @Test
    fun `returns valid key if key's revoked status is false`() {
        val unrevokedKey = validKey.copy(isRevoked = false)
        ValidatedIdentity.validate(unrevokedKey, now).shouldNotBeNull()
    }

    @Test
    fun `returns user role when user scope is set`() {
        val userKey = validKey.copy(scopes = setOf(":user"))
        val validatedApiKey = ValidatedIdentity.validate(userKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe(orgId)
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe(userId)
        validatedApiKey.scopes.shouldContainExactly(":user")
        validatedApiKey.roles.shouldContainExactlyInAnyOrder(UserRole, AuthenticatedRole)
    }

    @Test
    fun `returns admin role when admin scope is set`() {
        val adminKey = validKey.copy(scopes = setOf(":administrator"))
        val validatedApiKey = ValidatedIdentity.validate(adminKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe(orgId)
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe(userId)
        validatedApiKey.scopes.shouldContainExactly(":administrator")
        validatedApiKey.roles.shouldContainExactlyInAnyOrder(AdministratorRole, AuthenticatedRole)
    }

    @Test
    fun `returns account_admin role when account_admin scope is set`() {
        val sysAdminKey = validKey.copy(scopes = setOf(":account_administrator"))
        val validatedApiKey = ValidatedIdentity.validate(sysAdminKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe(orgId)
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe(userId)
        validatedApiKey.scopes.shouldContainExactly(":account_administrator")
        validatedApiKey.roles.shouldContainExactlyInAnyOrder(AccountAdministratorRole, AuthenticatedRole)
    }

    @Test
    fun `returns secure_container role when secure_container scope is set`() {
        val sysAdminKey = validKey.copy(scopes = setOf(":secure_container"))
        val validatedApiKey = ValidatedIdentity.validate(sysAdminKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe(orgId)
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe(userId)
        validatedApiKey.scopes.shouldContainExactly(":secure_container")
        validatedApiKey.roles.shouldContainExactlyInAnyOrder(SecureContainerRole, AuthenticatedRole)
    }

    @Test
    fun `returns both user and admin role when both scopes are set`() {
        val twoRoleKey = validKey.copy(scopes = setOf(":administrator", ":user"))
        val validatedApiKey = ValidatedIdentity.validate(twoRoleKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe(orgId)
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe(userId)
        validatedApiKey.scopes.shouldContainExactlyInAnyOrder(":user", ":administrator")
        validatedApiKey.roles.shouldContainExactlyInAnyOrder(UserRole, AdministratorRole, AuthenticatedRole)
    }

    @Test
    fun `returns multiple roles when WhyLabs admin scope is set`() {
        val whylabsAdminKey = validKey.copy(
            scopes = setOf(WhyLabsAdministratorScope)
        ).withOrgId(WhyLabsSuperAdminOrgId)

        val validatedApiKey = ValidatedIdentity.validate(whylabsAdminKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe("0")
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe("keyHash")
        validatedApiKey.scopes.shouldContainExactly(":whylabs_administrator")
        validatedApiKey.roles.shouldContainExactly(setOf(WhyLabsAdministratorRole) union ExternalRoleScopes.values)
    }

    @Test
    fun `returns multiple roles when WhyLabs system scope is set`() {
        val whylabsAdminKey = validKey.copy(
            scopes = setOf(WhyLabsSystemScope),
        ).withOrgId(WhyLabsSuperAdminOrgId)

        val validatedApiKey = ValidatedIdentity.validate(whylabsAdminKey, now)
        validatedApiKey.shouldNotBeNull()
        validatedApiKey.orgId.shouldBe("0")
        validatedApiKey.identityId.shouldBe(keyId)
        validatedApiKey.principalId.shouldBe("keyHash")
        validatedApiKey.scopes.shouldContainExactly(":whylabs_system")
        validatedApiKey.roles.shouldContainExactly(setOf(WhyLabsSystemRole) union ExternalRoleScopes.values)
    }

    @Test
    fun `ignores WhyLabs scope if org id is not WhyLabs`() {
        val whylabsAdminKey = validKey.copy(
            scopes = setOf(WhyLabsSystemScope)
        )
        val validatedIdentity = ValidatedIdentity.validate(whylabsAdminKey, now)
        validatedIdentity.shouldNotBeNull()
        validatedIdentity.orgId.shouldBe(orgId)
        validatedIdentity.identityId.shouldBe(keyId)
        validatedIdentity.principalId.shouldBe(userId)
        validatedIdentity.scopes.shouldContainExactly(":whylabs_system")
        validatedIdentity.roles.shouldContainExactlyInAnyOrder(AuthenticatedRole)
    }
}

internal class ApiKeyTest {
    @Test
    fun `should throw exception when key id is invalid`() {
        val exception = assertThrows<IllegalArgumentException> { ApiKey("id", "suffix") }
        exception.message.shouldStartWith("Incorrect ID len")
    }

    @Test
    fun `should throw exception when key suffix is invalid`() {
        val exception = assertThrows<IllegalArgumentException> { ApiKey("1a2b3c4d5e", "suffix") }
        exception.message.shouldStartWith("Invalid suffix len")
    }

    @Test
    fun `should parse valid key`() {
        val key = ApiKey.generateKey()
        val newKey = ApiKey("1a2b3c4d5e", key.suffix)
        val res = ApiKey.parse("${newKey.id}.${newKey.suffix}")

        res.shouldBe(newKey)
    }

    @Test
    fun `should return null when invalid id format`() {
        val key = ApiKey.generateKey()
        val newKey = ApiKey("1a2b-c4d5e", key.suffix)
        val res = ApiKey.parse("${newKey.id}.${newKey.suffix}")

        res.shouldBeNull()
    }

    @Test
    fun `should return null when invalid suffix format`() {
        val key = ApiKey.generateKey()

        // "." is an invalid character. We put it in the middle of the suffix to see if the regex catch it
        val newSuffix = key.suffix.substring(0, 29) + "." + key.suffix.substring(30)
        val res = ApiKey.parse("${key.id}.$newSuffix")

        // the math above might be wrong - worth checking!
        newSuffix.shouldHaveLength(ApiKey.SuffixLen)
        res.shouldBeNull()
    }
}

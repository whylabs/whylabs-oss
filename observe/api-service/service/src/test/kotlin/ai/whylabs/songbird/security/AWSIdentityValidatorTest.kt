package ai.whylabs.songbird.security

import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemRole
import ai.whylabs.songbird.security.SecurityValues.WhyLabsSystemScope
import com.amazonaws.services.securitytoken.AWSSecurityTokenService
import com.amazonaws.services.securitytoken.model.AWSSecurityTokenServiceException
import com.amazonaws.services.securitytoken.model.GetCallerIdentityResult
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.mockk.called
import io.mockk.clearAllMocks
import io.mockk.confirmVerified
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class AWSIdentityValidatorTest {
    @RelaxedMockK
    lateinit var stsClientFactory: STSClientFactory

    @RelaxedMockK
    lateinit var awsAccountContext: AwsAccountContext

    private val awsIdentityValidator by lazy {
        AWSIdentityValidator(stsClientFactory, awsAccountContext)
    }

    private val exampleCreds = AWSSessionCredentials(
        "ExampleKey",
        "ExampleSecret",
        "ExampleSession"
    )

    private val exampleKey =
        """{"AccessKeyId": "ExampleKey", "SecretAccessKey": "ExampleSecret", "SessionToken": "ExampleSession"}"""

    @AfterEach
    fun resetMocks() = clearAllMocks()

    @Test
    fun `it parses and returns a validated token`() {
        val sts: AWSSecurityTokenService = mockk(relaxed = true)
        every { stsClientFactory.create(any()) }.returns(sts)
        every { awsAccountContext.getAwsAccountId() }.returns("1234")

        val stsResult = GetCallerIdentityResult()
            .withAccount("1234")
            .withArn("exampleArn")
        every { sts.getCallerIdentity(any()) }.returns(stsResult)
        val result = awsIdentityValidator.validate(exampleKey)

        verify(exactly = 1) {
            stsClientFactory.create(exampleCreds)
        }
        verify(exactly = 1) { awsAccountContext.getAwsAccountId() }
        result.shouldNotBeNull()
        result.orgId.shouldBe("0")
        result.principalId.shouldBe("exampleArn")
        result.scopes.shouldContain(WhyLabsSystemScope)
        result.roles.shouldContain(WhyLabsSystemRole)
        confirmVerified(stsClientFactory)
        confirmVerified(awsAccountContext)
    }

    @Test
    fun `it should reject mismatched AWS account IDs`() {
        val sts: AWSSecurityTokenService = mockk(relaxed = true)
        every { stsClientFactory.create(any()) }.returns(sts)
        every { awsAccountContext.getAwsAccountId() }.returns("1234")

        val stsResult = GetCallerIdentityResult()
            .withAccount("7891")
            .withArn("exampleArn")
        every { sts.getCallerIdentity(any()) }.returns(stsResult)
        val result = awsIdentityValidator.validate(exampleKey)

        verify(exactly = 1) {
            stsClientFactory.create(exampleCreds)
        }
        verify(exactly = 1) { awsAccountContext.getAwsAccountId() }

        result.shouldBeNull()

        confirmVerified(stsClientFactory)
        confirmVerified(awsAccountContext)
    }

    @Test
    fun `it should use cached item for the same token`() {
        val sts: AWSSecurityTokenService = mockk(relaxed = true)
        every { stsClientFactory.create(any()) }.returns(sts)
        every { sts.getCallerIdentity(any()) }.returns(GetCallerIdentityResult().withArn("exampleArn"))
        awsIdentityValidator.validate(exampleKey)
        awsIdentityValidator.validate(exampleKey)
        awsIdentityValidator.validate(exampleKey)

        verify(exactly = 1) {
            stsClientFactory.create(
                exampleCreds
            )
        }
        confirmVerified(stsClientFactory)
    }

    @Test
    fun `it should return null if AWS throws exception`() {
        val sts: AWSSecurityTokenService = mockk(relaxed = true)
        every { stsClientFactory.create(any()) }.returns(sts)
        every { sts.getCallerIdentity(any()) }.throws(AWSSecurityTokenServiceException("Example"))
        awsIdentityValidator.validate(exampleKey).shouldBeNull()

        verify(exactly = 1) {
            stsClientFactory.create(exampleCreds)
        }
        confirmVerified(stsClientFactory)
    }

    @Test
    fun `it should return null if input is invalid`() {
        awsIdentityValidator.validate("""{"data": }""").shouldBeNull()

        verify { stsClientFactory wasNot called }
        confirmVerified(stsClientFactory)
    }
}

package ai.whylabs.songbird.security

import com.amazonaws.services.securitytoken.AWSSecurityTokenService
import com.amazonaws.services.securitytoken.model.GetCallerIdentityRequest
import jakarta.inject.Inject
import jakarta.inject.Singleton

interface AwsAccountContext {
    fun getAwsAccountId(): String
}

@Singleton
class AwsAccountContextImpl @Inject constructor(sts: AWSSecurityTokenService) : AwsAccountContext {
    private val accountId: String = sts.getCallerIdentity(GetCallerIdentityRequest()).account

    override fun getAwsAccountId(): String = accountId
}

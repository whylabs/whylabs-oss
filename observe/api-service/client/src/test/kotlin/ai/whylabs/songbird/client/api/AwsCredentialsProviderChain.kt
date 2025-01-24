package ai.whylabs.songbird.client.api

import com.amazonaws.auth.AWSCredentials
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.auth.BasicAWSCredentials
import com.amazonaws.auth.BasicSessionCredentials
import com.google.common.collect.ImmutableMap
import org.slf4j.LoggerFactory
import software.amazon.awssdk.auth.credentials.AwsCredentials
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.auth.credentials.ProfileProviderCredentialsContext
import software.amazon.awssdk.profiles.Profile
import software.amazon.awssdk.services.sso.auth.SsoProfileCredentialsProviderFactory

/**
 * This class was forked from the similarly named version in source code to
 * enable tests to lookup aws credentials like we do in development.
 */
class AwsCredentialsProviderChain : AwsCredentialsProvider, AWSCredentialsProvider {
    private val log = LoggerFactory.getLogger(this::class.java)

    private val defaultCredentialsProvider: DefaultCredentialsProvider =
        DefaultCredentialsProvider.create()
    private val ssoCreds: AwsCredentialsProvider =
        SsoProfileCredentialsProviderFactory().create(
            ProfileProviderCredentialsContext.builder().
            profile(DevSsoCredentials).build())

    override fun resolveCredentials(): AwsCredentials {
        return try {
            ssoCreds.resolveCredentials()
        } catch (e: Throwable) {
            log.warn("Unable to fetch SSO credentials")
            defaultCredentialsProvider.resolveCredentials()
        }
    }

    override fun getCredentials(): AWSCredentials {
        return when (val cred = resolveCredentials()) {
            is AwsSessionCredentials -> {
                BasicSessionCredentials(
                    cred.accessKeyId(),
                    cred.secretAccessKey(),
                    cred.sessionToken()
                )
            }
            else -> {
                BasicAWSCredentials(cred.accessKeyId(), cred.secretAccessKey())
            }
        }
    }

    override fun refresh() {}

    companion object {
        private val AwsProps: Map<String, String> = ImmutableMap.builder<String, String>()
            .put("region", "us-west-2")
            .put("sso_region", "us-west-2")
            .put("sso_start_url", "https://whylabs.awsapps.com/start#/")
            .put("sso_account_id", "207285235248") // development account
            .put("sso_role_name", "DeveloperFullAccess")
            .build()
        private val DevSsoCredentials: Profile =
            Profile.builder().name("DevSsoCredentials").properties(
                AwsProps
            ).build()
    }
}

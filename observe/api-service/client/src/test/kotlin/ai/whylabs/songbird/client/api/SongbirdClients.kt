package ai.whylabs.songbird.client.api

import ai.whylabs.songbird.client.infrastructure.ApiClient
import com.amazonaws.services.securitytoken.AWSSecurityTokenServiceClient
import com.amazonaws.services.securitytoken.model.AssumeRoleRequest
import com.amazonaws.services.securitytoken.model.AssumeRoleWithWebIdentityRequest
import java.time.Duration

const val DemoSandboxOrg = "org-1"

class SongbirdClients {
    companion object {
        private val EnvEndpoint: String? =
            System.getenv("SONGBIRD_ENDPOINT")?.takeIf { it.isNotBlank() }
        private const val DevRoleArn = "arn:aws:iam::207285235248:role/development-songbird-access"
        private val AssumeRoleArn: String =
            System.getenv("SONGBIRD_IAM_ROLE")?.takeIf { it.isNotBlank() } ?: DevRoleArn

        // GitLab pipeline
        private val GitLabPipelineRoleArn =
            System.getenv("AWS_ROLE_ARN")?.takeIf { it.isNotBlank() }
        private val GitLabJobJwtToken =
            System.getenv("CI_JOB_JWT_V2")?.takeIf { it.isNotBlank() }


        private val BasePath = EnvEndpoint ?: "http://localhost:8080"
        private const val ApiKeyHeader = "X-API-Key"
        val DatasetProfileClient: DatasetProfileApi
        val LogClient: LogApi
        val NotificationClient: NotificationSettingsApi
        val InternalApiClient: InternalApi
        val ModelsApiClient: ModelsApi
        val OrgClient: OrganizationsApi
        val UserClient: UserApi
        val MembershipClient: MembershipApi
        val ProvisionClient: ProvisionApi
        val ApiKeyClient: ApiKeyApi
        val FeatureFlagsClient: FeatureFlagsApi

        init {
            EnvEndpoint?.apply {
                println("SONGBIRD_ENDPOINT is set. Endpoint: $this")
            }
            val stsClient = AWSSecurityTokenServiceClient.builder().withRegion("us-west-2")
                .withCredentials(AwsCredentialsProviderChain())
                .build()

            val credentials = if (!GitLabJobJwtToken.isNullOrBlank()) {
                println("In GitLab. GitLab role ARN: $GitLabPipelineRoleArn")
                val req = AssumeRoleWithWebIdentityRequest()
                    .withRoleArn(GitLabPipelineRoleArn!!)
                    .withWebIdentityToken(GitLabJobJwtToken)
                    .withDurationSeconds(3600)
                    .withRoleSessionName("GitLabRunner-SongbirdTest")


                stsClient.assumeRoleWithWebIdentity(req).credentials
            } else {
                println("Assuming role: $AssumeRoleArn")

                val request =
                    AssumeRoleRequest().withRoleArn(AssumeRoleArn)
                        .withRoleSessionName("integration-test")

                stsClient.assumeRole(request).credentials
            }

            ApiClient.apiKey[ApiKeyHeader] =
                """{"AccessKeyId": "${credentials.accessKeyId}", "SecretAccessKey": "${credentials.secretAccessKey}", "SessionToken": "${credentials.sessionToken}"}"""
            ApiClient.builder
                .callTimeout(Duration.ofMinutes(15))
                .build()
            DatasetProfileClient = DatasetProfileApi(BasePath)
            LogClient = LogApi(BasePath)
            NotificationClient = NotificationSettingsApi(BasePath)
            InternalApiClient = InternalApi(BasePath)
            ModelsApiClient = ModelsApi(BasePath)
            OrgClient = OrganizationsApi(BasePath)
            UserClient = UserApi(BasePath)
            MembershipClient = MembershipApi(BasePath)
            ProvisionClient = ProvisionApi(BasePath)
            ApiKeyClient = ApiKeyApi(BasePath)
            FeatureFlagsClient = FeatureFlagsApi(BasePath)

            println("Using base path: $BasePath")
        }
    }
}

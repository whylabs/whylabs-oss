package ai.whylabs.songbird

import ai.whylabs.songbird.EnvironmentVariable.EnableSecurity
import ai.whylabs.songbird.logging.JsonLogging

enum class Stage {
    Local, Personal, Development, Integration, Production,
}

val DefaultObservatoryEndpoint = "https://hub.whylabsapp.com"

enum class EnvironmentVariable(val value: String) {
    AwsProfile("AWS_PROFILE"),
    ApiKeyTable("API_KEY_TABLE"),
    DataServiceEndpoint("DATA_SERVICE_API_ENDPOINT"),
    DataTable("DATA_TABLE"),
    DruidIngestionKinesisDataStream("DRUID_INGESTION_KINESIS_DATA_STREAM"),
    EnableSecurity("ENABLE_SECURITY"),
    MetadataTable("METADATA_TABLE"),
    GlobalActionsTable("GLOBAL_ACTIONS_TABLE"),
    StorageBucket("STORAGE_BUCKET"),
    Stage("STAGE"),
    TestNotificationQueueArn("TEST_NOTIFICATION_QUEUE_ARN"),
    UserMembershipQueueArn("USER_MEMBERSHIP_NOTIFICATION_QUEUE_ARN"),
    UserMembershipDLQArn("USER_MEMBERSHIP_NOTIFICATION_DLQ_ARN"),
    StorageBucketUntrustedPrefix("STORAGE_BUCKET_UNTRUSTED_PREFIX"),
    AWSMarketplaceSubscriptionQueueURL("AWS_MARKETPLACE_SUBSCRIPTION_QUEUE_URL"),
    AWSMarketplaceSubscriptionDLQURL("AWS_MARKETPLACE_SUBSCRIPTION_DLQ_URL"),
    AWSMarketplaceProductCode("AWS_MARKETPLACE_PRODUCT_CODE"),
    GCPSecretId("GCP_SECRET_ID"),
    GCPWorkspaceId("GCP_PROJECT_ID"),
    GCPPubsubTopicName("GCP_PUBSUB_TOPIC_NAME"),
    CfSignerSecretId("CLOUDFRONT_LOG_SM_ID"),
    CfLogDomain("CLOUDFRONT_LOG_DOMAIN"),
    CfKeyPairId("CLOUDFRONT_LOG_KEYPAIR_ID"),
    ObservatoryEndpoint("OBSERVATORY_ENDPOINT"),
    ScimServiceEndpoint("SCIM_SERVICE_API_ENDPOINT"),
    DiagnoserServiceEndpoint("DIAGNOSER_SERVICE_API_ENDPOINT"),
    AzureSecretName("AZURE_SECRET_NAME"),
    AzureEventHubName("AZURE_EVENT_HUB_NAME"),
    ElastiCacheHostName("ELASTICACHE_HOSTNAME"),
    ElastiCachePort("ELASTICACHE_PORT"),
    LocalOverrideAWSAccessKey("LOCAL_OVERRIDE_AWS_ACCESS_KEY"),
    LocalOverrideAWSSecretKey("LOCAL_OVERRIDE_AWS_SECRET_KEY"),
    LocalOverrideAWSRegion("LOCAL_OVERRIDE_AWS_REGION"),
    LocalOverrideAWSSessionToken("LOCAL_OVERRIDE_AWS_SESSION_TOKEN"),
    AuditLogsBigQueryTable("AUDIT_LOGS_TABLE_BIGQUERY"),
    AuditLogsExportBucket("AUDIT_LOGS_EXPORT_BUCKET"),
    KTLOMode("KTLO_MODE"),
    ;
}

interface EnvironmentConfig {
    fun getStage(): Stage
    fun getRegion(): String
    fun getEnv(variable: EnvironmentVariable, defaultValue: String? = null): String
    fun isAuthorizationDisabled(): Boolean
    fun isECS(): Boolean
    fun getDataServiceEndpoint(): String?
    fun getScimServiceEndpoint(): String?
    fun getDiagnoserServiceEndpoint(): String?
    fun getIndexPrefix(): String
}

class MissingEnvironmentVariableException(variableName: EnvironmentVariable) :
    IllegalStateException("Environment variable [${variableName.value}] is not set")

class EnvironmentConfigImpl(
    private val stage: Stage,
    private val region: String,
    private val env: Map<String, String>,
) : EnvironmentConfig, JsonLogging {
    companion object {
        private const val DevDataServiceEndpoint = "http://dev-dataservice"
        private const val DevScimServiceEndpoint = "http://scim-svc.corestack.dev.whylabs"
        private const val DevDiagnoserServiceEndpoint = "http://diagnoser-svc.corestack.dev.whylabs"
    }

    override fun getStage(): Stage {
        return stage
    }

    override fun getRegion(): String {
        return region
    }

    override fun isAuthorizationDisabled(): Boolean {
        if (stage != Stage.Local) {
            return false
        }

        val isSecurityEnabled = env[EnableSecurity.value]?.toBoolean() ?: false

        if (!isSecurityEnabled) {
            log.error(
                "Set environment variable {} or system property enable.security to true to test auth locally",
                EnableSecurity.value
            )
        }
        return !isSecurityEnabled
    }

    override fun isECS(): Boolean {
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4.html
        return System.getenv("ECS_CONTAINER_METADATA_URI_V4") != null
    }

    private fun getEndpoint(envVar: String, devDefault: String): String? {
        val envEndpoint = env[envVar]
        return if (envEndpoint.isNullOrBlank() && stage == Stage.Local) {
            log.warn("Using development endpoint for local stage")
            devDefault
        } else {
            envEndpoint
        }
    }

    override fun getDataServiceEndpoint(): String? {
        return getEndpoint(EnvironmentVariable.DataServiceEndpoint.value, DevDataServiceEndpoint)
    }

    override fun getScimServiceEndpoint(): String? {
        return getEndpoint(EnvironmentVariable.ScimServiceEndpoint.value, DevScimServiceEndpoint)
    }

    override fun getDiagnoserServiceEndpoint(): String? {
        return getEndpoint(EnvironmentVariable.DiagnoserServiceEndpoint.value, DevDiagnoserServiceEndpoint)
    }

    override fun getIndexPrefix(): String {
        return if (stage == Stage.Local) {
            "personal-${System.getProperty("user.name")}@"
        } else {
            ""
        }
    }

    override fun getEnv(variable: EnvironmentVariable, defaultValue: String?): String {
        val res = env[variable.value]
        if (res == null && defaultValue != null) {
            return defaultValue
        }
        return res ?: throw MissingEnvironmentVariableException(variable)
    }
}

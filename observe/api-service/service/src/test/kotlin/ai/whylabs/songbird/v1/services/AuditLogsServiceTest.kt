import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.v0.dao.AuditLogsDAO
import ai.whylabs.songbird.v0.models.AuditLog
import ai.whylabs.songbird.v1.services.AuditLogsService
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.model.ObjectMetadata
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.io.InputStream

internal class AuditLogsServiceTest {

    private lateinit var auditLogsService: AuditLogsService
    private lateinit var auditLogsDAO: AuditLogsDAO
    private lateinit var s3: AmazonS3
    private lateinit var config: EnvironmentConfig

    @BeforeEach
    fun setup() {
        auditLogsDAO = mockk()
        s3 = mockk(relaxed = true)
        config = mockk()
        every { config.getEnv(EnvironmentVariable.AuditLogsExportBucket) } returns "fake-bucket"
        auditLogsService = AuditLogsService(auditLogsDAO, s3, config)
    }

    @Test
    fun `test dump writes data to S3 as expected`() = runBlocking {
        val testAuditLogs = listOf(
            AuditLog(
                accountId = "test-org",
                eventName = "test-event",
                statusCode = "200",
                apiKeyOwner = "test-principal",
                apiKeyId = "test-identity",
                messageId = "test-message-id",
                publishTime = "2021-01-01T00:00:00Z"
            ),
            AuditLog(
                accountId = "test-org",
                eventName = "test-event",
                statusCode = "400",
                apiKeyOwner = "test-principal",
                apiKeyId = "test-identity",
                messageId = "test-message-id",
                publishTime = "2021-01-02T00:00:00Z"
            )
        ).asSequence()

        every { auditLogsDAO.query(any(), any(), any(), any(), any(), any(), any(), any(), any()) } returns testAuditLogs

        auditLogsService.dump(
            accountId = "test-account",
            startDate = null,
            endDate = null,
            limit = null,
            offset = null,
            eventName = null,
            statusCode = null,
            principalId = null,
            identityId = null
        )

        verify { s3.putObject(any(), match<String> { it.startsWith("audit-logs/") }, any<InputStream>(), any<ObjectMetadata>()) }
    }
}

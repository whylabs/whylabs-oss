package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.bigquery.BigQueryService
import ai.whylabs.songbird.v0.models.AuditContent
import ai.whylabs.songbird.v0.models.AuditLog
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

interface AuditLogsDAO {
    fun query(
        accountId: String,
        startDate: String?,
        endDate: String?,
        limit: Long?,
        offset: Long?,
        eventName: String?,
        statusCode: String?,
        principalId: String?,
        identityId: String?
    ): Sequence<AuditLog>

    fun fetchContentByMessageId(messageId: String, publishDate: String): AuditContent

    fun parseDate(date: String?, fallbackDate: Date?, fieldName: String): String
}

@Singleton
class AuditLogsDAOImpl @Inject constructor(
    private val bq: BigQueryService,
    config: EnvironmentConfig,
) : AuditLogsDAO {
    private val auditLogsTable = config.getEnv(EnvironmentVariable.AuditLogsBigQueryTable)

    override fun parseDate(date: String?, fallbackDate: Date?, fieldName: String): String {
        try {
            val sdf = SimpleDateFormat("yyyy-MM-dd")
            if (date != null) {
                val parsedDate = sdf.parse(date)
                return sdf.format(parsedDate)
            }
            return sdf.format(fallbackDate)
        } catch (e: Exception) {
            throw IllegalArgumentException("Failed to parse $fieldName: $date, use 'YYYY-MM-dd' format")
        }
    }

    override fun query(
        accountId: String,
        startDate: String?,
        endDate: String?,
        limit: Long?,
        offset: Long?,
        eventName: String?,
        statusCode: String?,
        principalId: String?,
        identityId: String?
    ): Sequence<AuditLog> {
        val parsedStartDate = parseDate(startDate, Date(), "start_date")
        val parsedEndDate = parseDate(endDate, Date(), "end_date")
        val sqlQuery = StringBuilder(
            """
            SELECT
                message_id,
                publish_time,
                account_id,
                principal_id,
                event_name,
                status_code,
                identity_id
            FROM
                `$auditLogsTable` 
            WHERE
                (account_id = '$accountId' OR STRING(content.requestParmeters.arguments.org_id) = '$accountId')
                AND TIMESTAMP_TRUNC(publish_time, DAY) >= TIMESTAMP('$parsedStartDate')
                AND TIMESTAMP_TRUNC(publish_time, DAY) <= TIMESTAMP('$parsedEndDate')
                AND event_name NOT IN ("GetPolicy")
            """.trimIndent()
        )

        eventName?.let {
            sqlQuery.append(" AND event_name = '$it'")
        }

        statusCode?.let {
            sqlQuery.append(" AND status_code = '$it'")
        }

        principalId?.let {
            sqlQuery.append(" AND principal_id = '$it'")
        }

        identityId?.let {
            sqlQuery.append(" AND identity_id = '$it'")
        }

        limit?.let {
            sqlQuery.append(" LIMIT $limit")
        }

        offset?.let {
            sqlQuery.append(" OFFSET $offset")
        }

        sqlQuery.append(
            """
            ORDER BY
                publish_time DESC
            """.trimIndent()
        )

        return bq.query(sqlQuery.toString()).map {
            AuditLog(
                messageId = it["message_id"].value.toString(),
                publishTime = convertTimestampToDate(it["publish_time"].value.toString()) ?: it["publish_time"].value.toString(),
                accountId = it["account_id"].value.toString(),
                apiKeyId = it["identity_id"].value.toString(),
                apiKeyOwner = it["principal_id"].value.toString(),
                eventName = it["event_name"].value.toString(),
                statusCode = it["status_code"].value.toString()
            )
        }
    }

    private fun convertTimestampToDate(publishTime: String): String? {
        val timestampDouble = publishTime.toDouble()
        val timestampLong = timestampDouble.toLong() * 1000
        val date = Date(timestampLong)

        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return dateFormat.format(date)
    }

    override fun fetchContentByMessageId(messageId: String, publishDate: String): AuditContent {
        val sqlQuery = """
            SELECT
                message_id, content
            FROM
                `$auditLogsTable`
            WHERE
                message_id = '$messageId'
            AND
                TIMESTAMP_TRUNC(publish_time, DAY) = TIMESTAMP('$publishDate')
        """.trimIndent()

        val result = bq.query(sqlQuery).firstOrNull()
        return if (result != null) {
            AuditContent(
                messageId = result["message_id"].value.toString(),
                content = result["content"].value.toString()
            )
        } else {
            AuditContent(
                messageId = messageId,
                content = "No content found for message id: $messageId"
            )
        }
    }
}

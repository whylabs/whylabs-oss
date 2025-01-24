package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceAlreadyExistsException
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.operations.getValidatedIdentity
import ai.whylabs.songbird.v0.ddb.ActionType
import ai.whylabs.songbird.v0.ddb.DdbUtils.query
import ai.whylabs.songbird.v0.ddb.NotificationActionItem
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBSaveExpression
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import com.amazonaws.services.dynamodbv2.model.ConditionalOperator
import com.amazonaws.services.dynamodbv2.model.ExpectedAttributeValue
import jakarta.inject.Inject
import jakarta.inject.Singleton

interface NotificationActionDAO {
    fun getNotificationAction(orgId: String, actionId: String): NotificationActionItem?

    fun createNotificationAction(orgId: String, actionId: String, type: ActionType, payload: String)

    fun listNotificationActions(orgId: String): List<NotificationActionItem>

    fun updateNotificationAction(orgId: String, type: ActionType, actionId: String, payload: String)

    fun deleteNotificationAction(orgId: String, actionId: String)

    fun enableNotificationAction(orgId: String, actionId: String)

    fun disableNotificationAction(orgId: String, actionId: String)
}

@Singleton
class NotificationActionDAOImpl @Inject constructor(
    private val ddbMapper: DynamoDBMapper,
) : NotificationActionDAO, JsonLogging {
    private fun getAuthor(): String = getValidatedIdentity()?.principalId ?: ""
    private fun getVersion(orgId: String, actionId: String): Long {
        val existingItem = getNotificationAction(orgId, actionId) ?: throw ResourceNotFoundException("Could not load action $actionId for $orgId")
        return existingItem.version ?: throw ResourceNotFoundException("Unable to load version number for action $actionId in $orgId")
    }

    override fun getNotificationAction(orgId: String, actionId: String): NotificationActionItem? {
        log.debug("Get notification action for orgId=$orgId actionId=$actionId")
        val query = DynamoDBQueryExpression<NotificationActionItem>()
            .withHashKeyValues(
                NotificationActionItem(
                    id = actionId,
                )
            ).withRangeKeyCondition(
                "org_id",
                Condition()
                    .withComparisonOperator(ComparisonOperator.EQ)
                    .withAttributeValueList(AttributeValue().withS(orgId))
            )
            .withFilterExpression("attribute_not_exists(deleted) or deleted = :not_deleted")
            .withExpressionAttributeValues(
                mapOf<String?, AttributeValue?>(":not_deleted" to AttributeValue().withBOOL(false))
            )

        return ddbMapper.query(query).firstOrNull()
    }

    override fun createNotificationAction(orgId: String, actionId: String, type: ActionType, payload: String) {
        val author = getAuthor()

        log.debug("Create notification action $actionId for: orgId=$orgId type=$type payload=$payload")
        val item = NotificationActionItem.create(
            id = actionId,
            orgId = orgId,
            type = type,
            payload = payload,
            author = author,
        )

        try {
            // You cannot reuse Id + orgId from deleted records since they already exist in the table
            ddbMapper.save(
                item,
                DynamoDBSaveExpression()
                    .withExpectedEntry("id", ExpectedAttributeValue(false))
                    .withExpectedEntry("org_id", ExpectedAttributeValue(false))
                    .withConditionalOperator(ConditionalOperator.AND)
            )
        } catch (e: ConditionalCheckFailedException) {
            throw ResourceAlreadyExistsException("actionId", "$orgId/$actionId")
        }
    }

    override fun listNotificationActions(orgId: String): List<NotificationActionItem> {
        log.debug("List notification action for orgId=$orgId")
        val query = DynamoDBQueryExpression<NotificationActionItem>()
            .withIndexName(NotificationActionItem.OrgIndex)
            .withHashKeyValues(
                NotificationActionItem(
                    orgId = orgId
                )
            )
            .withFilterExpression("attribute_not_exists(deleted) or deleted = :not_deleted")
            .withExpressionAttributeValues(
                mapOf<String?, AttributeValue?>(":not_deleted" to AttributeValue().withBOOL(false))
            )

        return ddbMapper.query(query)
    }

    // only updates payload, to update action-id, org-id or type create a new action
    override fun updateNotificationAction(orgId: String, type: ActionType, actionId: String, payload: String) {
        val author = getAuthor()
        val currentVersion = getVersion(orgId, actionId)

        log.debug("Update notification action - orgId=$orgId actionId=$actionId payload=$payload version=$currentVersion")
        val item = NotificationActionItem.update(
            id = actionId, // cannot update
            orgId = orgId, // cannot update
            type = type,
            payload = payload,
            author = author,
            version = currentVersion
        )
        ddbMapper.save(
            item,
            DynamoDBSaveExpression()
                .withExpectedEntry("id", ExpectedAttributeValue(AttributeValue().withS(actionId)))
                .withExpectedEntry("org_id", ExpectedAttributeValue(AttributeValue().withS(orgId)))
                .withExpectedEntry("deleted", ExpectedAttributeValue(AttributeValue().withBOOL(false)))
                .withConditionalOperator(ConditionalOperator.AND),
            DynamoDBMapperConfig.builder()
                .withSaveBehavior(DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES)
                .build()
        )
    }

    override fun enableNotificationAction(orgId: String, actionId: String) {
        val author = getAuthor()
        val currentVersion = getVersion(orgId, actionId)
        log.debug("Enabling notification action - actionId=$actionId orgId=$orgId version=$currentVersion")

        val item = NotificationActionItem.update(
            id = actionId,
            orgId = orgId,
            author = author,
            enabled = true,
            version = currentVersion
        )

        ddbMapper.save(
            item,
            DynamoDBSaveExpression()
                .withExpectedEntry("id", ExpectedAttributeValue(AttributeValue().withS(actionId)))
                .withExpectedEntry("org_id", ExpectedAttributeValue(AttributeValue().withS(orgId)))
                .withExpectedEntry("deleted", ExpectedAttributeValue(AttributeValue().withBOOL(false)))
                .withConditionalOperator(ConditionalOperator.AND),
            DynamoDBMapperConfig.builder()
                .withSaveBehavior(DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES)
                .build()
        )
    }

    override fun disableNotificationAction(orgId: String, actionId: String) {
        val author = getAuthor()
        val currentVersion = getVersion(orgId, actionId)
        log.debug("Disabling notification action - actionId=$actionId orgId=$orgId version=$currentVersion")

        val item = NotificationActionItem.update(
            id = actionId,
            orgId = orgId,
            author = author,
            enabled = false,
            version = currentVersion
        )

        ddbMapper.save(
            item,
            DynamoDBSaveExpression()
                .withExpectedEntry("id", ExpectedAttributeValue(AttributeValue().withS(actionId)))
                .withExpectedEntry("org_id", ExpectedAttributeValue(AttributeValue().withS(orgId)))
                .withExpectedEntry("deleted", ExpectedAttributeValue(AttributeValue().withBOOL(false)))
                .withConditionalOperator(ConditionalOperator.AND),
            DynamoDBMapperConfig.builder()
                .withSaveBehavior(DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES)
                .build()
        )
    }

    override fun deleteNotificationAction(orgId: String, actionId: String) {
        val author = getAuthor()
        val currentVersion = getVersion(orgId, actionId)
        log.debug("Delete notification action - actionId=$actionId orgId=$orgId version=$currentVersion")

        val item = NotificationActionItem.update(
            id = actionId,
            orgId = orgId,
            author = author,
            deleted = true,
            enabled = false,
            version = currentVersion
        )

        ddbMapper.save(
            item,
            DynamoDBSaveExpression()
                .withExpectedEntry("id", ExpectedAttributeValue(AttributeValue().withS(actionId)))
                .withExpectedEntry("org_id", ExpectedAttributeValue(AttributeValue().withS(orgId)))
                .withExpectedEntry("deleted", ExpectedAttributeValue(AttributeValue().withBOOL(false)))
                .withConditionalOperator(ConditionalOperator.AND),
            DynamoDBMapperConfig.builder()
                .withSaveBehavior(DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES)
                .build()
        )
    }
}

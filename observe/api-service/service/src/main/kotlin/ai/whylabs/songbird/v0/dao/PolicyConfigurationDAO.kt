package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.secure.policy.PolicyConfiguration
import ai.whylabs.songbird.v0.ddb.DdbConditions
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.ModelKey
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import ai.whylabs.songbird.v0.ddb.PolicyConfigurationItem
import ai.whylabs.songbird.v0.ddb.PolicyConfigurationKey
import ai.whylabs.songbird.v0.ddb.PrimaryKey
import ai.whylabs.songbird.v0.ddb.SecondaryKey
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.model.AttributeAction
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.AttributeValueUpdate
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.dynamodbv2.model.ReturnValue
import com.amazonaws.services.dynamodbv2.model.UpdateItemRequest
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class PolicyConfigurationDAO @Inject constructor(
    private val mapper: DynamoDBMapper,
    private val config: EnvironmentConfig,
    private val ddb: AmazonDynamoDB,
) : DynamoCRUD<PolicyConfigurationItem, PolicyConfiguration, ItemId.String>,
    JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = PolicyConfigurationItem::class.java

    override fun toItem(apiModel: PolicyConfiguration): PolicyConfigurationItem {
        return PolicyConfigurationItem(
            key = PolicyConfigurationKey(apiModel.orgId, apiModel.datasetId, apiModel.version),
            orgId = apiModel.orgId,
            datasetId = apiModel.datasetId,
            version = apiModel.version,
            policy = apiModel.policy,
            label = apiModel.label,
            author = apiModel.author,
            identity = apiModel.identity,
            source = apiModel.source,
        )
    }

    override fun toApiModel(item: PolicyConfigurationItem): PolicyConfiguration {
        return PolicyConfiguration(
            orgId = item.key.orgId,
            datasetId = item.key.datasetId,
            policy = item.policy,
            label = item.label,
            author = item.author,
            identity = item.identity,
            version = item.version,
            source = item.source,
            creationTime = item.creationTime,
        )
    }

    fun listByOrganization(orgId: String, limit: Int? = 1000): Sequence<PolicyConfiguration> {
        val query = DynamoDBQueryExpression<PolicyConfigurationItem>()
            .withIndexName("orgs-index")
            .withConsistentRead(false)
            .withKeyConditionExpression("sk = :skValue and org_id = :orgId")
            .withExpressionAttributeValues(
                mapOf(
                    ":skValue" to AttributeValue().withS("POLICY_CONFIG"),
                    ":orgId" to AttributeValue().withS(orgId)
                )
            )
            .withLimit(limit)
        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    override fun list(
        item: PolicyConfigurationItem,
        index: String?,
        limit: Int?,
        rangeKeyConditions: Map<String, Condition>?
    ): Sequence<PolicyConfiguration> {
        return query(item = item, index = index, limit = limit)
    }

    fun query(
        item: PolicyConfigurationItem,
        index: String? = getListIndex(),
        limit: Int? = 100,
        queryFilters: Map<String, Condition>? = emptyMap()
    ): Sequence<PolicyConfiguration> {
        if (index == null) {
            throw IllegalArgumentException("Item cannot be listed")
        }
        val filters = mutableMapOf<String, Condition>(
            "dataset_id" to Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(item.datasetId))
        )
        filters.putAll(queryFilters ?: emptyMap())

        val query = DynamoDBQueryExpression<PolicyConfigurationItem>()
            .withIndexName(index)
            .withConsistentRead(false)
            .withHashKeyValues(item)
            .withRangeKeyConditions(DdbConditions.shouldEq("org_id", item.orgId))
            .withQueryFilter(filters)
            .withLimit(limit)

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    override fun getListIndex(): String {
        return OrganizationItem.Index
    }

    override fun createId(item: PolicyConfigurationItem): ItemId.String {
        return ItemId.String(String.format("%s#%s%%s", item.orgId, item.datasetId, item.version))
    }

    fun incrementAndGetId(orgId: String, datasetId: String): Long {
        val counterAttr = "counter"
        val req = UpdateItemRequest()
            .withTableName(config.getEnv(EnvironmentVariable.MetadataTable))
            .withKey(
                mapOf(
                    PrimaryKey to ModelKey(orgId, datasetId).toAttr(),
                    SecondaryKey to AttributeValue("POLICY_CONFIG_COUNTER")
                )
            )
            .addAttributeUpdatesEntry(
                counterAttr,
                AttributeValueUpdate(AttributeValue().withN("1"), AttributeAction.ADD)
            )
            .withReturnValues(ReturnValue.UPDATED_NEW)

        val result = ddb.updateItem(req)
        return result.attributes[counterAttr]?.n?.toLong()!!
    }
}

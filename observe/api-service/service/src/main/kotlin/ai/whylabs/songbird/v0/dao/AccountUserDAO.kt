package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.AccountUserItem
import ai.whylabs.songbird.v0.ddb.AccountUserPrefix
import ai.whylabs.songbird.v0.ddb.DdbConditions.shouldEq
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.OrganizationItem
import ai.whylabs.songbird.v0.ddb.SecondaryKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class AccountUserDAO @Inject constructor(private val mapper: DynamoDBMapper) : DynamoCRUD<AccountUserItem, AccountUser, ItemId.None>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = AccountUserItem::class.java

    override fun list(
        item: AccountUserItem,
        index: String?,
        limit: Int?,
        rangeKeyConditions: Map<String, Condition>?
    ): Sequence<AccountUser> {
        if (index == null) {
            throw IllegalArgumentException("Item cannot be listed")
        }
        val conditions = mapOf(
            SecondaryKey to Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(AccountUserPrefix)),
            "deleted" to Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withBOOL(false))
        )
        val query = DynamoDBQueryExpression<AccountUserItem>()
            .withIndexName(index)
            .withConsistentRead(false)
            .withHashKeyValues(item)
            .withRangeKeyConditions(rangeKeyConditions)
            .withQueryFilter(conditions)
            .withLimit(limit)

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    fun listForOrganization(
        orgId: String,
        limit: Int? = 200,
        queryFilterConditions: Map<String, Condition>? = null
    ): Sequence<AccountUser> {
        val queryConditions = mutableMapOf(
            "deleted" to Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withBOOL(false))
        )
        queryConditions += queryFilterConditions ?: emptyMap()

        val query = DynamoDBQueryExpression<AccountUserItem>()
            .withIndexName(OrganizationItem.Index)
            .withConsistentRead(false)
            .withHashKeyValues(AccountUserItem())
            .withRangeKeyConditions(shouldEq("org_id", orgId))
            .withQueryFilter(queryConditions)
            .withLimit(limit)

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    fun getAccountUserById(orgId: String, userId: String): AccountUser? {
        val conditions = mapOf(
            "user_id" to Condition()
                .withComparisonOperator(ComparisonOperator.EQ)
                .withAttributeValueList(AttributeValue().withS(userId))
        )
        val items = listForOrganization(orgId = orgId, limit = 1, queryFilterConditions = conditions).toList()
        if (items.isEmpty()) {
            return null
        }
        return items.first()
    }

    override fun toItem(apiModel: AccountUser): AccountUserItem {
        return AccountUserItem(
            userId = apiModel.userId,
            orgId = apiModel.orgId,
            externalId = apiModel.externalId,
            email = apiModel.email,
            userSchema = apiModel.userSchema,
            active = apiModel.active,
        )
    }

    override fun toApiModel(item: AccountUserItem): AccountUser {
        return AccountUser(
            userId = item.userId,
            orgId = item.orgId,
            externalId = item.externalId,
            email = item.email,
            userSchema = item.userSchema,
            active = item.active,
        )
    }

    override fun getListIndex() = "email-index"

    override fun createId(item: AccountUserItem): ItemId.None {
        return ItemId.None
    }
}

@Schema(description = "Account User metadata", requiredProperties = ["id", "userId"])
data class AccountUser(
    @field:Schema(description = "The WhyLabs user id")
    val userId: String,
    @field:Schema(description = "The WhyLabs organization id")
    val orgId: String,
    @field:Schema(description = "External user id")
    val externalId: String? = null,
    @field:Schema(description = "The user's email address")
    val email: String,
    // https://developer.okta.com/docs/guides/scim-provisioning-integration-prepare/main/#basic-user-schema
    @field:Schema(description = "User schema")
    val userSchema: String?,
    @field:Schema(description = "Flag to indicate if the user is active")
    val active: Boolean? = true,
)

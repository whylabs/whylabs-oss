package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.sha256
import ai.whylabs.songbird.v0.controllers.User
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.SecondaryKey
import ai.whylabs.songbird.v0.ddb.UserItem
import ai.whylabs.songbird.v0.ddb.UserPrefix
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class UserDAO @Inject constructor(private val mapper: DynamoDBMapper) : DynamoCRUD<UserItem, User, ItemId.String>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = UserItem::class.java

    override fun list(
        item: UserItem,
        index: String?,
        limit: Int?,
        rangeKeyConditions: Map<String, Condition>?
    ): Sequence<User> {
        if (index == null) {
            throw IllegalArgumentException("Item cannot be listed")
        }

        val query = DynamoDBQueryExpression<UserItem>()
            .withIndexName(index)
            .withConsistentRead(false)
            .withHashKeyValues(item)
            .withRangeKeyConditions(rangeKeyConditions)
            .withQueryFilter(
                mapOf(
                    SecondaryKey to Condition()
                        .withComparisonOperator(ComparisonOperator.EQ)
                        .withAttributeValueList(AttributeValue().withS(UserPrefix))
                )
            )
            .withLimit(limit)

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    override fun toItem(apiModel: User): UserItem {
        return UserItem(
            email = apiModel.email,
            userId = apiModel.userId,
            preferences = apiModel.preferences,
        )
    }

    override fun toApiModel(item: UserItem): User {
        return User(
            email = item.email,
            userId = item.userId,
            preferences = item.preferences,
        )
    }

    override fun getListIndex() = "email-index"

    override fun createId(item: UserItem): ItemId.String {
        val newUserId = "user-${UserDAO.createId(item.email)}"
        return ItemId.String(newUserId)
    }

    fun listValidated(email: String, expectExisting: Boolean?): List<User> {
        val userEmail = email.lowercase()
        val matchingUsers = list(UserItem(email = userEmail)).toList()
        if (expectExisting == true && matchingUsers.isEmpty()) {
            throw IllegalArgumentException("Expected user to exist, but no matching users found.")
        }
        if (expectExisting == false && matchingUsers.isNotEmpty()) {
            throw IllegalArgumentException("Email already exists.")
        }
        return matchingUsers
    }

    companion object {
        private const val salt = "f36e6cbe-5c10-417c-ba69-0d9bcd16439e"
        private fun createId(email: String): String {
            return email.sha256(salt)
        }
    }
}

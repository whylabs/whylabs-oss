package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.operations.ResourceNotFoundException
import ai.whylabs.songbird.security.ApiKey
import ai.whylabs.songbird.util.DateUtils
import ai.whylabs.songbird.util.toDate
import ai.whylabs.songbird.util.toISOString
import ai.whylabs.songbird.v0.ddb.ApiUserKey
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.DdbUtils
import ai.whylabs.songbird.v0.ddb.DdbUtils.query
import ai.whylabs.songbird.v0.ddb.DynamoDBItem
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.OrgKey
import ai.whylabs.songbird.v0.ddb.PlaceHolder
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBHashKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIgnore
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIndexHashKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIndexRangeKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperFieldModel.DynamoDBAttributeType
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTable
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTyped
import com.amazonaws.services.dynamodbv2.datamodeling.IDynamoDBMapper
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import io.swagger.v3.oas.annotations.media.ArraySchema
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.util.Date

interface ApiKeyDAO {
    fun load(keyHash: String): ApiKeyItem?

    fun updateLastUsed(keyHash: String, lastUsedTime: Date?): ApiKeyItem?

    suspend fun newApiKey(
        orgId: String,
        userId: String,
        expirationTime: Long?,
        scopes: Set<String>?,
        alias: String?,
        resourceId: String?,
    ): Pair<UserApiKey, ApiKeyItem>

    suspend fun listApiKeys(orgId: String, userId: String): ListUserApiKeys
    suspend fun revokeApiKey(orgId: String, userId: String, keyId: String): UserApiKey
}

@Singleton
@Suppress("UnstableApiUsage")
class ApiKeyDAOImpl @Inject constructor(private val ddbMapper: IDynamoDBMapper) : ApiKeyDAO, JsonLogging {
    override fun load(keyHash: String): ApiKeyItem? {
        return ddbMapper.load(ApiKeyItem(keyHash = keyHash))
    }

    override fun updateLastUsed(keyHash: String, lastUsedTime: Date?): ApiKeyItem? {
        val key = ApiKeyItem(keyHash = keyHash)
        val item = ddbMapper.load(key)
        if (item != null) {
            ddbMapper.save(
                item.copy(lastUsedTime = lastUsedTime),
                DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES.config()
            )
        }
        return item
    }

    override suspend fun newApiKey(
        orgId: String,
        userId: String,
        expirationTime: Long?,
        scopes: Set<String>?,
        alias: String?,
        resourceId: String?,
    ): Pair<UserApiKey, ApiKeyItem> {
        // we opportunistically retry until we get a hash that doesn't exist in the system yet
        val (key, keyItem) = DdbUtils.retry(
            ConditionalCheckFailedException::class,
            maxRetries = 5
        ) {
            val key = ApiKey.generateKey()

            val apiKey = ApiKeyItem(
                orgKey = OrgKey(orgId),
                userKey = ApiUserKey(orgId, userId),
                keyHash = key.toHash(),
                keyId = key.id,
                scopes = scopes,
                alias = alias,
                resourceId = resourceId,
                expirationTime = expirationTime?.let { Instant.ofEpochMilli(it).toDate() },
            )

            ddbMapper.save(apiKey, DdbExpressions.ShouldNotExistSaveExpr)

            log.info {
                msg("Created API key")
                meta("orgId" to orgId, "userId" to userId, "keyId" to key.id)
            }

            Pair(key, apiKey)
        }

        val userApiKey = UserApiKey(
            key = key.toString(),
            keyId = keyItem.keyId,
            orgId = orgId,
            userId = userId,
            creationTime = DateUtils.getISOString(ZonedDateTime.now(ZoneOffset.UTC).toInstant()),
            expirationTime = expirationTime?.let {
                DateUtils.getISOString(it)
            },
            scopes = scopes,
            alias = alias,
            revoked = false,
            resourceId = resourceId,
        )

        return Pair(userApiKey, keyItem)
    }

    override suspend fun listApiKeys(orgId: String, userId: String): ListUserApiKeys {
        val query = DynamoDBQueryExpression<ApiKeyItem>()
            .withIndexName(ApiKeyItem.Index)
            .withHashKeyValues(
                ApiKeyItem(
                    orgKey = OrgKey(orgId),
                    userKey = ApiUserKey(orgId, userId),
                )
            )

        val results = ddbMapper.query(query)
            .iterator()
            .asSequence()
            .map {
                UserApiKey(
                    keyId = it.keyId,
                    orgId = orgId,
                    userId = userId,
                    creationTime = it.creationTime.let { ct ->
                        DateUtils.getISOString(ct.toInstant())
                    },
                    expirationTime = it.expirationTime?.let { et ->
                        DateUtils.getISOString(et.toInstant())
                    },
                    scopes = it.scopes,
                    alias = it.alias,
                    revoked = it.isRevoked,
                    resourceId = it.resourceId,
                )
            }
            .toList()

        return ListUserApiKeys(results)
    }

    override suspend fun revokeApiKey(orgId: String, userId: String, keyId: String): UserApiKey {
        val query = DynamoDBQueryExpression<ApiKeyItem>()
            .withIndexName(ApiKeyItem.Index)
            .withHashKeyValues(
                ApiKeyItem(
                    orgKey = OrgKey(orgId),
                    userKey = ApiUserKey(orgId, userId),
                )
            )
            .withRangeKeyCondition(
                ApiKeyItem.KeyIdAttr,
                Condition()
                    .withComparisonOperator(ComparisonOperator.EQ)
                    .withAttributeValueList(AttributeValue().withS(keyId))
            )

        val results = ddbMapper.query(query).iterator().asSequence().toList()

        if (results.isEmpty()) {
            throw ResourceNotFoundException("ApiKey", keyId)
        }

        if (results.size > 1) {
            throw IllegalStateException("More than one API key with ID $keyId found. Unable to revoke it.")
        }

        val existingKeyMeta = results.first()
        val userApiKey = UserApiKey(
            keyId = keyId,
            orgId = orgId,
            userId = userId,
            alias = existingKeyMeta.alias,
            scopes = existingKeyMeta.scopes,
            creationTime = existingKeyMeta.creationTime.toISOString(),
            expirationTime = existingKeyMeta.expirationTime?.toISOString(),
            revoked = existingKeyMeta.isRevoked,
            resourceId = existingKeyMeta.resourceId,
        )
        if (existingKeyMeta.isRevoked == true) {
            log.debug {
                msg("Key has already been revoked")
                meta("keyId" to keyId, "orgId" to orgId, "userId" to userId)
            }
            return userApiKey
        }

        ddbMapper.save(
            existingKeyMeta.copy(isRevoked = true),
            DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES.config()
        )

        return userApiKey.copy(revoked = true)
    }
}

@DynamoDBTable(tableName = "See ai.whylabs.songbird.v0.ddb.MapperFactory")
data class ApiKeyItem(
    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBAttribute(attributeName = "org_id")
    @DynamoDBIndexHashKey(globalSecondaryIndexName = OrgIndex)
    var orgKey: OrgKey = OrgKey(PlaceHolder),

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBAttribute(attributeName = UserIdAttr)
    @DynamoDBIndexHashKey(globalSecondaryIndexName = Index)
    var userKey: ApiUserKey = ApiUserKey(PlaceHolder, PlaceHolder),

    @DynamoDBHashKey(attributeName = "key_hash")
    var keyHash: String = "",

    @DynamoDBAttribute(attributeName = KeyIdAttr)
    @DynamoDBIndexRangeKey(globalSecondaryIndexName = Index)
    var keyId: String = "",

    @DynamoDBAttribute(attributeName = "alias")
    var alias: String? = "",

    @DynamoDBAttribute(attributeName = "expiration_time")
    var expirationTime: Date? = null,

    @DynamoDBAttribute(attributeName = "creation_time")
    var creationTime: Date = Date(),

    @DynamoDBAttribute(attributeName = "last_used_time")
    var lastUsedTime: Date? = null,

    var scopes: Set<String>? = null,

    @DynamoDBAttribute(attributeName = "resource_id")
    var resourceId: String? = null,

    @DynamoDBAttribute(attributeName = "is_revoked")
    var isRevoked: Boolean? = false,

) : DynamoDBItem<ApiKeyItem, ItemId.String> {
    companion object {
        const val Index = "keys-idx"
        const val OrgIndex = "org-index"
        const val UserIdAttr = "user_id"
        const val KeyIdAttr = "key_id"
    }

    @DynamoDBIgnore
    override fun getPrimaryKey() = userKey
    override fun setId(id: String) = this

    @DynamoDBIgnore
    override fun getId() = ItemId.String(keyId)

    /**
     * Util function to create a new key with the given org id. There are
     * two things that use the key so this keeps them both in sync.
     */
    fun withOrgId(orgId: String): ApiKeyItem {
        return copy(
            orgKey = OrgKey(orgId),
            userKey = ApiUserKey(orgId, userKey.userId)
        )
    }
}

data class UserApiKeyResponse(
    // **CLIENT_GEN_ISSUE nullable = false needed to avoid allOf issue
    @field:Schema(nullable = false)
    val key: UserApiKey?
)

@Schema(description = "Response when creating an API key successfully", requiredProperties = ["keyId", "orgId", "userId", "creationTime"])
data class UserApiKey(
    @field:Schema(
        description = "The full value of the key. This is not persisted in the system",
    ) val key: String? = null,
    @field:Schema(
        description = "The key id. Can be used to identify keys for a given user",
    )
    val keyId: String,
    @field:Schema(
        description = "The organization that the key belongs to",
    )
    val orgId: String,
    @field:Schema(
        description = "The user that the key represents",
    )
    val userId: String,
    @field:Schema(
        description = "Creation time in human readable format",
    )
    val creationTime: String,
    @field:Schema(
        description = "Expiration time in human readable format",
    )
    val expirationTime: String?,
    @field:Schema(
        description = "Last used time in human readable format",
    )
    val lastUsedTime: String? = null,
    @field:Schema(
        description = "Scope of the key",
    )
    val scopes: Set<String>?,
    @field:Schema(
        description = "Restrict write data scope to this resource id",
    )
    val resourceId: String?,
    @field:Schema(
        description = "Human-readable alias for the key",
    )
    val alias: String?,
    @field:Schema(
        description = "Whether the key has been revoked"
    )
    val revoked: Boolean?,
)

@Schema(description = "Response for listing API key metadata", requiredProperties = ["items"])
data class ListUserApiKeys(
    @field:ArraySchema(
        arraySchema = Schema(description = "A list of all known API key metadata"),
        uniqueItems = true,
    )
    val items: List<UserApiKey>,
)

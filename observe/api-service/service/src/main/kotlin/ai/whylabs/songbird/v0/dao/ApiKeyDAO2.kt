package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.parseAsISO
import ai.whylabs.songbird.util.toISOString
import ai.whylabs.songbird.v0.ddb.ApiUserKey
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.OrgKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class ApiKeyDAO2 @Inject constructor(private val mapper: DynamoDBMapper) : DynamoCRUD<ApiKeyItem, UserApiKey, ItemId.String>, JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = ApiKeyItem::class.java
    override fun getListIndex(): String = "" // ApiKeyItem.Index
    override fun createId(item: ApiKeyItem) = throw RuntimeException("Use incrementAndGetModelId to generate new model ids")

    override fun toItem(apiModel: UserApiKey): ApiKeyItem {
        return ApiKeyItem(
            orgKey = OrgKey(apiModel.orgId),
            userKey = ApiUserKey(apiModel.orgId, apiModel.userId),
            keyId = apiModel.keyId,
            alias = apiModel.alias,
            expirationTime = apiModel.expirationTime?.parseAsISO(),
            creationTime = apiModel.creationTime.parseAsISO(),
            lastUsedTime = apiModel.lastUsedTime?.parseAsISO(),
            scopes = apiModel.scopes,
            isRevoked = apiModel.revoked,
            resourceId = apiModel.resourceId,
        )
    }

    override fun toApiModel(item: ApiKeyItem): UserApiKey {
        return UserApiKey(
            orgId = item.orgKey.orgId,
            userId = item.userKey.userId,
            keyId = item.keyId,
            alias = item.alias,
            expirationTime = item.expirationTime?.toISOString(),
            creationTime = item.creationTime.toISOString(),
            lastUsedTime = item.lastUsedTime?.toISOString(),
            scopes = item.scopes,
            revoked = item.isRevoked,
            resourceId = item.resourceId,
        )
    }
}

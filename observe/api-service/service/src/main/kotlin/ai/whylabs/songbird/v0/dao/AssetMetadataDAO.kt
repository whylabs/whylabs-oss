package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.AssetMetadataItem
import ai.whylabs.songbird.v0.ddb.AssetMetadataKey
import ai.whylabs.songbird.v0.ddb.DdbConditions
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.OrganizationItem
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
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class AssetMetadataDAO @Inject constructor(
    private val mapper: DynamoDBMapper,
    private val config: EnvironmentConfig,
    private val ddb: AmazonDynamoDB,
) : DynamoCRUD<AssetMetadataItem, AssetMetadata, ItemId.String>,
    JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = AssetMetadataItem::class.java

    override fun toItem(apiModel: AssetMetadata): AssetMetadataItem {
        val orgAssetId = "${apiModel.orgId}#${apiModel.assetId}"
        return AssetMetadataItem(
            key = AssetMetadataKey(apiModel.orgId, apiModel.assetId, apiModel.tag, apiModel.version),
            orgId = apiModel.orgId,
            assetId = apiModel.assetId,
            version = apiModel.version,
            assetVersion = apiModel.version.toInt(),
            s3Uri = apiModel.s3Uri,
            tag = apiModel.tag,
            uploaded = apiModel.uploaded,
            orgAssetId = orgAssetId,
        )
    }

    override fun toApiModel(item: AssetMetadataItem): AssetMetadata {
        return AssetMetadata(
            orgId = item.key.orgId,
            assetId = item.key.assetId,
            s3Uri = item.s3Uri,
            assetVersion = item.version.toInt(),
            version = item.version,
            tag = item.tag,
            uploaded = item.uploaded,
        )
    }

    fun listOrgAssets(orgId: String): Sequence<AssetTagEntry> {
        val queryExpression = DynamoDBQueryExpression<AssetMetadataItem>()
            .withHashKeyValues(AssetMetadataItem(orgId = orgId))
            .withIndexName(getListIndex())
            .withRangeKeyConditions(DdbConditions.shouldEq("org_id", orgId))
            .withConsistentRead(false)

        val assetSet = mutableSetOf<AssetTagEntry>()

        getMapper().query(getCls(), queryExpression)
            .iterator()
            .asSequence()
            .map(::toApiModel)
            .forEach { asset ->
                val uniqueAsset = AssetTagEntry(asset.assetId, asset.tag)
                assetSet.add(uniqueAsset)
            }
        return assetSet.asSequence()
    }

    fun query(
        item: AssetMetadataItem,
        limit: Int? = 100,
        version: Int? = null,
        queryFilter: Map<String, Condition>? = emptyMap()
    ): Sequence<AssetMetadata> {
        val orgAssetId = "${item.orgId}#${item.assetId}"
        var query = DynamoDBQueryExpression<AssetMetadataItem>()
            .withIndexName(AssetMetadataItem.OrgAssetIndex)
            .withConsistentRead(false)
            .withHashKeyValues(AssetMetadataItem(orgAssetId = orgAssetId))
            .withQueryFilter(queryFilter)
            .withLimit(limit)

        if (version != null) {
            query = query.withRangeKeyConditions(
                mapOf(
                    "asset_version" to Condition()
                        .withComparisonOperator(ComparisonOperator.EQ)
                        .withAttributeValueList(AttributeValue().withN(version.toString()))
                )
            )
        }

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    override fun getListIndex(): String {
        return OrganizationItem.Index
    }

    override fun createId(item: AssetMetadataItem): ItemId.String {
        return ItemId.String(String.format("%s#%s%%s", item.orgId, item.assetId, item.version))
    }

    fun incrementAndGetId(orgId: String, assetId: String, tag: String): Long {
        val counterAttr = "counter"
        val req = UpdateItemRequest()
            .withTableName(config.getEnv(EnvironmentVariable.MetadataTable))
            .withKey(
                mapOf(
                    PrimaryKey to AssetMetadataKey(orgId, assetId, tag, counterAttr).toAttr(),
                    SecondaryKey to AttributeValue("ASSET_METADATA_COUNTER")
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

@Schema(description = "Storage for asset metadata")
data class AssetMetadata(
    val orgId: String,
    val assetId: String,
    val version: String,
    val assetVersion: Int,
    val s3Uri: String,
    val tag: String,
    val uploaded: Boolean? = false,
)

data class AssetTagEntry(
    val assetId: String,
    val tag: String,
)

package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.LogTransactionKey
import ai.whylabs.songbird.v0.ddb.LogTransactionMetadataItem
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.util.Date

data class LogTransactionMetadata(
    val orgId: String,
    val datasetId: String,
    val transactionId: String,
    val expirationTime: Date?,
    val aborted: Boolean?,
)

@Singleton
class LogTransactionDAO @Inject constructor(private val mapper: DynamoDBMapper) :
    DynamoCRUD<LogTransactionMetadataItem, LogTransactionMetadata, ItemId.String>,
    JsonLogging {
    override fun getMapper() = mapper
    override fun getLogger() = log
    override fun getCls() = LogTransactionMetadataItem::class.java

    override fun createId(item: LogTransactionMetadataItem): ItemId.String {
        return ItemId.String(item.transactionId)
    }

    override fun toItem(apiModel: LogTransactionMetadata): LogTransactionMetadataItem {
        return LogTransactionMetadataItem(
            key = LogTransactionKey(apiModel.transactionId),
            orgId = apiModel.orgId,
            datasetId = apiModel.datasetId,
            transactionId = apiModel.transactionId,
            expirationTime = apiModel.expirationTime,
            aborted = apiModel.aborted,
        )
    }

    override fun toApiModel(item: LogTransactionMetadataItem): LogTransactionMetadata {
        return LogTransactionMetadata(
            orgId = item.orgId,
            datasetId = item.datasetId,
            transactionId = item.transactionId,
            expirationTime = item.expirationTime,
            aborted = item.aborted,
        )
    }

    override fun getListIndex(): String {
        return LogTransactionMetadataItem.Index
    }
}

package ai.whylabs.songbird.v0.ddb

import ai.whylabs.songbird.util.toISOString
import ai.whylabs.songbird.v0.models.Segment
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBAttribute
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBDocument
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBHashKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIgnore
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIndexHashKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBIndexRangeKey
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperFieldModel.DynamoDBAttributeType
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTable
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTypeConvertedEnum
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTyped
import java.util.Date

enum class LogEntryStatus {
    UPLOADED,
    MERGED,
}

const val PrimaryKey = "pk"
const val SecondaryKey = "sk"

@DynamoDBDocument
data class S3Entry(
    var key: String = "",
    var etag: String = "",
    var bucket: String = "",
)

@DynamoDBTable(tableName = MapperFactory.PlaceHolder)
data class LogEntryItem(
    @DynamoDBIgnore
    private val orgId: String = PlaceHolder,

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBHashKey(attributeName = PrimaryKey)
    var key: LogEntryKey = LogEntryKey(orgId),

    @DynamoDBAttribute(attributeName = "model_id")
    var modelId: String = "",

    @DynamoDBAttribute(attributeName = "log_timestamp")
    var uploadTimestamp: Date = Date(),

    @DynamoDBAttribute(attributeName = "log_path")
    var path: String = "",

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBIndexHashKey(globalSecondaryIndexName = Index)
    @DynamoDBAttribute(attributeName = StagingGroupAttr)
    var stagingGroup: OrgKey? = OrgKey(orgId),

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBAttribute(attributeName = "log_merge_status")
    var status: LogEntryStatus = LogEntryStatus.UPLOADED,

    // additional data. To be removed once we read data from whylogs
    @DynamoDBTyped(DynamoDBAttributeType.S)
    var segment: Segment? = null,

    @DynamoDBAttribute(attributeName = "dataset_timestamp")
    var datasetTimestamp: Date? = null,
) : TypedItem(LogEntryPrefix) {

    companion object {
        const val Index = "log_entries-index"
        const val StagingGroupAttr = "log_staging_group"
    }
}

@DynamoDBTypeConvertedEnum
enum class ReferenceProfileItemStatus {
    // if you're adding more statuses, please deploy first before using new logic
    NOT_READY,
    READY,
}

@DynamoDBTable(tableName = MapperFactory.PlaceHolder)
data class ReferenceProfileItem(
    @DynamoDBAttribute(attributeName = "ref_org_id")
    var orgId: String = PlaceHolder,

    @DynamoDBAttribute(attributeName = "ref_model_id")
    var modelId: String = "",

    @DynamoDBIndexRangeKey(globalSecondaryIndexName = Index)
    @DynamoDBAttribute(attributeName = "upload_timestamp")
    var uploadTimestamp: Date = Date(),

    var alias: String = "ref-${uploadTimestamp.toInstant().toISOString()}",

    var path: String = "",

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBHashKey(attributeName = PrimaryKey)
    var key: ReferenceProfileKey = ReferenceProfileKey(orgId),

    @DynamoDBTypeConvertedEnum
    @DynamoDBAttribute
    var status: ReferenceProfileItemStatus = ReferenceProfileItemStatus.NOT_READY,

    @DynamoDBAttribute(attributeName = "reference_timestamp")
    var datasetTimestamp: Date? = null,

    var ttl: Long? = null,
) : TypedItem(ReferenceProfilePrefix) {
    companion object {
        const val Index = "reference_profiles_upload-index"
    }

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBIndexHashKey(globalSecondaryIndexName = Index)
    @DynamoDBAttribute(attributeName = "reference_dataset")
    var modelKey: ModelKey = ModelKey(orgId, modelId)
        get() = ModelKey(orgId, modelId)

    fun markReady(): ReferenceProfileItem = this.copy(status = ReferenceProfileItemStatus.READY)
}

@DynamoDBTable(tableName = MapperFactory.PlaceHolder)
data class SegmentedReferenceProfileItem(
    @DynamoDBAttribute(attributeName = "ref_org_id")
    var orgId: String = PlaceHolder,

    @DynamoDBAttribute(attributeName = "ref_model_id")
    var datasetId: String = "",

    @DynamoDBIndexRangeKey(globalSecondaryIndexName = Index)
    @DynamoDBAttribute(attributeName = "upload_timestamp")
    var uploadTimestamp: Date = Date(),

    var alias: String = "ref-${uploadTimestamp.toInstant().toISOString()}",

    var paths: List<String> = listOf(),

    var tags: List<String>? = null,

    var segments: List<String> = listOf(),

    var version: String? = null,

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBHashKey(attributeName = PrimaryKey)
    var key: SegmentedReferenceProfileKey = SegmentedReferenceProfileKey(orgId, datasetId, alias),

    @DynamoDBTypeConvertedEnum
    @DynamoDBAttribute
    var status: ReferenceProfileItemStatus = ReferenceProfileItemStatus.NOT_READY,

    @DynamoDBAttribute(attributeName = "reference_timestamp")
    var datasetTimestamp: Date? = null,

    var ttl: Long? = null,
) : TypedItem(SegmentedReferenceProfilePrefix) {
    companion object {
        const val Index = "reference_profiles_upload-index"
    }

    @DynamoDBTyped(DynamoDBAttributeType.S)
    @DynamoDBIndexHashKey(globalSecondaryIndexName = Index)
    @DynamoDBAttribute(attributeName = "reference_dataset")
    var modelKey: ModelKey = ModelKey(orgId, datasetId)
        get() = ModelKey(orgId, datasetId)

    fun markReady(): SegmentedReferenceProfileItem = this.copy(status = ReferenceProfileItemStatus.READY)
}

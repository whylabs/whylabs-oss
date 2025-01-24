package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import ai.whylabs.songbird.util.toISOString
import ai.whylabs.songbird.v0.ddb.DdbUtils.query
import ai.whylabs.songbird.v0.ddb.ReferenceProfileItem
import ai.whylabs.songbird.v0.ddb.ReferenceProfileItemStatus
import ai.whylabs.songbird.v0.ddb.ReferenceProfileKey
import ai.whylabs.songbird.v0.ddb.ReferenceProfilePrefix
import ai.whylabs.songbird.v0.ddb.SecondaryKey
import ai.whylabs.songbird.v0.ddb.SegmentedReferenceProfileItem
import ai.whylabs.songbird.v0.ddb.SegmentedReferenceProfileKey
import ai.whylabs.songbird.v0.ddb.SegmentedReferenceProfilePrefix
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.datamodeling.IDynamoDBMapper
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.s3.AmazonS3
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.time.Duration
import java.time.Instant
import java.util.Date

interface DatasetProfileDAO {
    fun listReferenceProfiles(
        orgId: String,
        modelId: String,
        fromEpoch: Long,
        toEpoch: Long,
    ): List<ReferenceProfileItem>

    fun listSegmentedReferenceProfiles(
        orgId: String,
        modelId: String,
        fromEpoch: Long,
        toEpoch: Long,
    ): List<SegmentedReferenceProfileItem>

    fun saveSegmentedReferenceProfile(
        referenceProfile: SegmentedReferenceProfileItem
    ): Boolean
    fun saveReferenceProfile(
        referenceProfile: ReferenceProfileItem
    ): Boolean

    fun getReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): ReferenceProfileItem?

    fun getSegmentedReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): SegmentedReferenceProfileItem?

    fun deleteReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): Boolean

    fun deleteSegmentedReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): Boolean
}

@Singleton
class DatasetProfileDAOImpl @Inject constructor(
    config: EnvironmentConfig,
    private val ddbMapper: IDynamoDBMapper,
    private val s3: AmazonS3,
) : DatasetProfileDAO, JsonLogging {

    private val storageBucket = config.getEnv(EnvironmentVariable.StorageBucket)

    override fun listReferenceProfiles(
        orgId: String,
        modelId: String,
        fromEpoch: Long,
        toEpoch: Long,
    ): List<ReferenceProfileItem> {
        val query =
            DynamoDBQueryExpression<ReferenceProfileItem>()
                .withIndexName(ReferenceProfileItem.Index)
                .withHashKeyValues(
                    ReferenceProfileItem(
                        orgId = orgId,
                        modelId = modelId,
                    )
                )
                .withRangeKeyConditions(
                    mapOf(
                        "upload_timestamp" to Condition()
                            .withComparisonOperator(ComparisonOperator.BETWEEN)
                            .withAttributeValueList(
                                AttributeValue().withS(Date(fromEpoch).toISOString()),
                                AttributeValue().withS(Date(toEpoch).toISOString())
                            )
                    )
                )
                .withQueryFilter(
                    mapOf(
                        SecondaryKey to Condition()
                            .withComparisonOperator(ComparisonOperator.EQ)
                            .withAttributeValueList(AttributeValue().withS(ReferenceProfilePrefix))
                    )
                )
                // set this to false so we get the value sorted descending by time
                .withScanIndexForward(false)

        val result = ddbMapper.query(query)

        return result
            .map {
                if (it.status == ReferenceProfileItemStatus.NOT_READY) {
                    // for older upload, we will remove them
                    handleNotReadyReference(it)
                } else {
                    it
                }
            }
            .filter { it.status == ReferenceProfileItemStatus.READY }
            .take(1000) // TODO: paginate the result
    }

    override fun listSegmentedReferenceProfiles(
        orgId: String,
        modelId: String,
        fromEpoch: Long,
        toEpoch: Long,
    ): List<SegmentedReferenceProfileItem> {
        val query =
            DynamoDBQueryExpression<SegmentedReferenceProfileItem>()
                .withIndexName(SegmentedReferenceProfileItem.Index)
                .withHashKeyValues(
                    SegmentedReferenceProfileItem(
                        orgId = orgId,
                        datasetId = modelId,
                    )
                )
                .withRangeKeyConditions(
                    mapOf(
                        "upload_timestamp" to Condition()
                            .withComparisonOperator(ComparisonOperator.BETWEEN)
                            .withAttributeValueList(
                                AttributeValue().withS(Date(fromEpoch).toISOString()),
                                AttributeValue().withS(Date(toEpoch).toISOString())
                            )
                    )
                )
                .withQueryFilter(
                    mapOf(
                        SecondaryKey to Condition()
                            .withComparisonOperator(ComparisonOperator.EQ)
                            .withAttributeValueList(AttributeValue().withS(SegmentedReferenceProfilePrefix))
                    )
                )
                // set this to false so we get the value sorted descending by time
                .withScanIndexForward(false)
        val result = ddbMapper.query(query)
        return result
            .map {
                if (it.status == ReferenceProfileItemStatus.NOT_READY) {
                    // for older upload, we will remove them
                    handleNotReadySegmentedReference(it)
                } else {
                    it
                }
            }
            .filter { it.status == ReferenceProfileItemStatus.READY }
            .take(1000) // TODO: paginate the result
    }

    override fun saveSegmentedReferenceProfile(referenceProfile: SegmentedReferenceProfileItem): Boolean {
        return try {
            ddbMapper.save(referenceProfile)
            true
        } catch (e: Exception) {
            log.error("Failed to save segmented reference profile", e)
            false
        }
    }

    override fun saveReferenceProfile(referenceProfile: ReferenceProfileItem): Boolean {
        return try {
            ddbMapper.save(referenceProfile)
            true
        } catch (e: Exception) {
            log.error("Failed to save reference profile", e)
            false
        }
    }

    override fun getReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): ReferenceProfileItem? {
        val originalResult = ddbMapper.load(
            ReferenceProfileItem(
                orgId,
                modelId,
                key = ReferenceProfileKey(orgId, referenceId)
            )
        ) ?: return null

        val updatedResult = when {
            originalResult.status != ReferenceProfileItemStatus.READY -> handleNotReadyReference(
                originalResult
            )
            else -> originalResult
        }

        return when (updatedResult.status) {
            ReferenceProfileItemStatus.READY -> updatedResult
            else -> null
        }
    }

    override fun getSegmentedReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): SegmentedReferenceProfileItem? {
        val originalResult = ddbMapper.load(
            SegmentedReferenceProfileItem(
                orgId,
                modelId,
                key = SegmentedReferenceProfileKey(orgId, modelId, referenceId)
            )
        ) ?: return null

        val updatedResult = when {
            originalResult.status != ReferenceProfileItemStatus.READY -> handleNotReadySegmentedReference(
                originalResult
            )
            else -> originalResult
        }

        return when (updatedResult.status) {
            ReferenceProfileItemStatus.READY -> updatedResult
            else -> null
        }
    }

    override fun deleteReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): Boolean {
        val item = ddbMapper.load(
            ReferenceProfileItem(
                orgId,
                modelId,
                key = ReferenceProfileKey(orgId, referenceId)
            )
        ) ?: return true

        try {
            // deleting the JSON metadata first, and then the binary objects
            s3.deleteObject(storageBucket, "${item.path.substringBefore(".bin")}.json")
            s3.deleteObject(storageBucket, item.path)
            ddbMapper.delete(item)
        } catch (e: Exception) {
            log.warn("Failed to delete object", e)
            return false
        }

        return true
    }

    override fun deleteSegmentedReferenceProfile(
        orgId: String,
        modelId: String,
        referenceId: String,
    ): Boolean {
        val item = ddbMapper.load(
            SegmentedReferenceProfileItem(
                orgId,
                modelId,
                key = SegmentedReferenceProfileKey(orgId, modelId, referenceId)
            )
        ) ?: return true

        item.paths.forEach { path ->
            try {
                // deleting the JSON metadata first, and then the binary objects
                s3.deleteObject(storageBucket, "${path.substringBefore(".bin")}.json")
                s3.deleteObject(storageBucket, path)
                ddbMapper.delete(item)
            } catch (e: Exception) {
                log.warn("Failed to delete object", e)
                return false
            }
        }

        return true
    }

    private fun handleNotReadyReference(refItem: ReferenceProfileItem): ReferenceProfileItem {
        val updatedItem = checkAndUpdateReferenceItem(refItem)

        return if (updatedItem.status != ReferenceProfileItemStatus.READY &&
            updatedItem.uploadTimestamp.toInstant()
                .isBefore(Instant.now().minus(Duration.ofMinutes(60)))
        ) {
            ddbMapper.delete(refItem)
            updatedItem // this is not ready so it will be filtered out
        } else {
            checkAndUpdateReferenceItem(refItem)
        }
    }

    private fun handleNotReadySegmentedReference(refItem: SegmentedReferenceProfileItem): SegmentedReferenceProfileItem {
        val updatedItem = checkAndUpdateSegmentedReferenceItem(refItem)

        return if (updatedItem.status != ReferenceProfileItemStatus.READY &&
            updatedItem.uploadTimestamp.toInstant()
                .isBefore(Instant.now().minus(Duration.ofMinutes(60)))
        ) {
            ddbMapper.delete(refItem)
            updatedItem // this is not ready so it will be filtered out
        } else {
            checkAndUpdateSegmentedReferenceItem(refItem)
        }
    }

    private fun checkAndUpdateReferenceItem(it: ReferenceProfileItem): ReferenceProfileItem {
        val isUploaded = try {
            s3.doesObjectExist(storageBucket, it.path)
        } catch (e: Exception) {
            log.warn("Failed to check object: s3://$storageBucket/${it.path}")
            false
        }

        return if (isUploaded) {
            val readyItem = it.markReady()
            ddbMapper.save(readyItem)
            readyItem
        } else {
            it
        }
    }

    private fun checkAndUpdateSegmentedReferenceItem(it: SegmentedReferenceProfileItem): SegmentedReferenceProfileItem {
        val isAllPathsUploaded = it.paths.map { path ->
            try {
                s3.doesObjectExist(storageBucket, path)
            } catch (e: Exception) {
                log.warn("Failed to check object: s3://$storageBucket/$path")
                false
            }
        }.all { it }

        return if (isAllPathsUploaded) {
            val readyItem = it.markReady()
            ddbMapper.save(readyItem)
            readyItem
        } else {
            it
        }
    }
}

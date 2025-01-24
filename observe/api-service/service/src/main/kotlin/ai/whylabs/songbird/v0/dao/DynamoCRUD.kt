package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.SongbirdLogger
import ai.whylabs.songbird.v0.ddb.DdbExpressions
import ai.whylabs.songbird.v0.ddb.DynamoDBItem
import ai.whylabs.songbird.v0.ddb.ItemId
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapperConfig.ConsistentReads
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.dynamodbv2.model.ConditionalCheckFailedException
import com.amazonaws.services.dynamodbv2.model.Select

/**
 * This provides most of the dynamodb functionality for a given type when implemented.
 * We have various other one-off abstractions that we're trying to phase out. Whenever possible,
 * use the thing that implements this interface over another option. When there is a conflict,
 * this one might be called SomethingDAO2 because SomethingDAO was already taken, but its intended
 * that the original abstractions will eventually be gone.
 */
interface DynamoCRUD<DDBItem : DynamoDBItem<DDBItem, Id>, APIModel, Id : ItemId> {

    fun getMapper(): DynamoDBMapper
    fun getLogger(): SongbirdLogger
    fun getCls(): Class<DDBItem>

    /**
     * Create a unique id suitable to this type of item. This doesn't have to
     * be a part of a primary key, though it probably will be. It's the thing that
     * uniquely identifies this item if anything does. If this item has no id then
     * this should return [ItemId.None].
     */
    fun createId(item: DDBItem): Id

    fun toItem(apiModel: APIModel): DDBItem
    fun toApiModel(item: DDBItem): APIModel

    /**
     * If this entity can be listed in ddb then this is the index that should
     * be used to do it. If the entity doesn't support listing then this will
     * return null.
     */
    fun getListIndex(): String?

    fun load(item: DDBItem, consistentReads: Boolean = false): APIModel? {
        val config = DynamoDBMapperConfig.builder()
            .withConsistentReads(if (consistentReads) ConsistentReads.CONSISTENT else ConsistentReads.EVENTUAL)
            .build()
        val result = getMapper().load(item, config) ?: return null
        return toApiModel(result)
    }

    fun count(item: DDBItem, index: String? = getListIndex(), limit: Int? = null): Int {
        if (index == null) {
            throw IllegalArgumentException("Item cannot be listed")
        }

        val query = DynamoDBQueryExpression<DDBItem>()
            .withIndexName(index)
            .withConsistentRead(false)
            .withHashKeyValues(item)
            .withSelect(Select.COUNT)

        return getMapper().queryPage(getCls(), query).count
    }

    fun list(item: DDBItem, index: String? = getListIndex(), limit: Int? = null, rangeKeyConditions: Map<String, Condition>? = null): Sequence<APIModel> {
        if (index == null) {
            throw IllegalArgumentException("Item cannot be listed")
        }

        val query = DynamoDBQueryExpression<DDBItem>()
            .withIndexName(index)
            .withConsistentRead(false)
            .withHashKeyValues(item)
            .withRangeKeyConditions(rangeKeyConditions)
            .withLimit(limit)

        return getMapper().query(getCls(), query)
            .iterator()
            .asSequence()
            .map(::toApiModel)
    }

    fun anyExist(item: DDBItem): Boolean {
        return try {
            list(item).first()
            true
        } catch (e: NoSuchElementException) {
            false
        }
    }

    fun exists(item: DDBItem): Boolean {
        return load(item) != null
    }

    /**
     * Util method to overwrite the id field of the item with an auto generated one form [#createId]
     * if the item doesn't have one already. We use the one that gets passed in if it exists to
     * allow for id overriding.
     */
    private fun copyWithNewId(inputItem: DDBItem): DDBItem {
        // Create an id for the item if one wasn't found in the spot where it should be.
        return when (val inputId = inputItem.getId()) {
            is ItemId.String -> {
                if (inputId.isUnset()) {
                    when (val newId = createId(inputItem)) {
                        is ItemId.String -> inputItem.setId(newId.id)
                        else -> inputItem
                    }
                } else {
                    inputItem
                }
            }
            is ItemId.None -> inputItem
            else -> throw IllegalStateException("Can't happen but Kotlin doesn't know there are only 2 options.")
        }
    }

    /**
     * @throws IllegalArgumentException If the item already exists.
     */
    fun create(inputItem: DDBItem): APIModel {
        // Create an id for the item if one wasn't found in the spot where it should be.
        val item = copyWithNewId(inputItem)

        try {
            getMapper().save(item, DdbExpressions.ShouldNotExistSaveExpr)
            return toApiModel(item)
        } catch (e: ConditionalCheckFailedException) {
            throw IllegalArgumentException("Item with key ${item.getPrimaryKey().toValidatedString(false)} already exists")
        }
    }

    /**
     *  Like [create] but it doesn't throw for cases where the item already exists
     */
    fun createIfNotExists(inputItem: DDBItem): APIModel? {
        return try {
            create(inputItem)
        } catch (e: IllegalArgumentException) {
            // do nothing
            null
        }
    }

    fun update(item: DDBItem) {
        getMapper().save(item, DdbExpressions.shouldExistSaveExpr(item.getPrimaryKey().toAttr()))
    }

    /**
     * Like update, but it uses the [DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES] save behavior,
     * which means null values will be ignored rather than setting fields to null in dynamo.
     */
    fun updatePartial(item: DDBItem) {
        val config = DynamoDBMapperConfig.builder()
            .withSaveBehavior(DynamoDBMapperConfig.SaveBehavior.UPDATE_SKIP_NULL_ATTRIBUTES)
            .build()

        getMapper().save(item, DdbExpressions.shouldExistSaveExpr(item.getPrimaryKey().toAttr()), config)
    }

    /**
     * @throws IllegalArgumentException If the item doesn't exist.
     */
    fun delete(t: DDBItem) {
        try {
            getMapper().delete(t, DdbExpressions.shouldExistDeleteExpr(t.getPrimaryKey().toAttr()))
        } catch (e: ConditionalCheckFailedException) {
            throw IllegalArgumentException("Item with key ${t.getPrimaryKey().toValidatedString(false)} doesn't exist")
        }
    }
}

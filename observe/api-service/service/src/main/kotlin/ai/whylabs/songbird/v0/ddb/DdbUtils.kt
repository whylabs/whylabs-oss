package ai.whylabs.songbird.v0.ddb

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBDeleteExpression
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBQueryExpression
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBSaveExpression
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTransactionWriteExpression
import com.amazonaws.services.dynamodbv2.datamodeling.IDynamoDBMapper
import com.amazonaws.services.dynamodbv2.datamodeling.PaginatedQueryList
import com.amazonaws.services.dynamodbv2.model.AmazonDynamoDBException
import com.amazonaws.services.dynamodbv2.model.AttributeValue
import com.amazonaws.services.dynamodbv2.model.ComparisonOperator
import com.amazonaws.services.dynamodbv2.model.Condition
import com.amazonaws.services.dynamodbv2.model.ExpectedAttributeValue
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.retryWhen
import kotlinx.coroutines.flow.single
import kotlin.random.Random
import kotlin.reflect.KClass

object DdbExpressions {
    val ShouldNotExistSaveExpr = DynamoDBSaveExpression()
        .withExpectedEntry(PrimaryKey, ExpectedAttributeValue(false))!!

    val ShouldExistSaveExpr = DynamoDBSaveExpression()
        .withExpectedEntry(PrimaryKey, ExpectedAttributeValue(true))!!

    fun shouldExistSaveExpr(pk: AttributeValue): DynamoDBSaveExpression {
        return DynamoDBSaveExpression()
            .withExpectedEntry(PrimaryKey, ExpectedAttributeValue(pk))
    }

    fun shouldExistDeleteExpr(pk: AttributeValue): DynamoDBDeleteExpression {
        return DynamoDBDeleteExpression().withExpectedEntry(PrimaryKey, ExpectedAttributeValue(pk))
    }

    val ShouldNotExistWriteExpr = DynamoDBTransactionWriteExpression()
        .withConditionExpression("attribute_not_exists(pk)")!!

    val ShouldExistWriteExpr = DynamoDBTransactionWriteExpression()
        .withConditionExpression("attribute_exists(pk)")!!
}

object DdbConditions {

    fun shouldEq(value: String): Condition {
        return Condition().withComparisonOperator(
            ComparisonOperator.EQ
        ).withAttributeValueList(
            AttributeValue().withS(value)
        )
    }

    fun shouldEq(rangeKey: String, value: String): Map<String, Condition> {
        return mapOf(
            rangeKey to shouldEq(value)
        )
    }
}

object DdbUtils {
    inline fun <reified T> IDynamoDBMapper.query(queryExpression: DynamoDBQueryExpression<T>): PaginatedQueryList<T> {
        if (queryExpression.indexName != null) {
            // if an index is set, consistent read must be false. It's annoying to set this everywhere
            queryExpression.withConsistentRead(false)
        }
        return this.query(T::class.java, queryExpression)!!
    }

    fun <T> IDynamoDBMapper.queryWithoutConsistentRead(cls: Class<T>, queryExpression: DynamoDBQueryExpression<T>): PaginatedQueryList<T> {
        if (queryExpression.indexName != null) {
            // if an index is set, consistent read must be false. It's annoying to set this everywhere
            queryExpression.withConsistentRead(false)
        }
        return this.query(cls, queryExpression)!!
    }

    suspend fun <R> retry(exception: KClass<out AmazonDynamoDBException>, maxRetries: Int = 3, runnable: () -> R): R {
        return flow {
            emit(runnable())
        }.retryWhen { cause, attempt -> exception.java.isInstance(cause) && attempt < maxRetries }.single()
    }

    suspend fun <T> retryWithBackoff(
        times: Int = 5,
        initialDelay: Long = 100, // 0.1 second
        maxDelay: Long = 5000, // 1 second
        jitter: Int = 20, // 20 milliseconds jitter
        factor: Double = 2.0,
        block: suspend () -> T,
    ): T {
        var currentDelay = initialDelay

        return flow {
            emit(block())
        }.retryWhen { cause, attempt ->
            if (cause is AmazonDynamoDBException) {
                delay(currentDelay)

                currentDelay = (currentDelay * factor + Random.nextInt(jitter)).toLong().coerceAtMost(maxDelay)
                times <= attempt
            } else {
                false
            }
        }.single()
    }
}

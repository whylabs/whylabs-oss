package ai.whylabs.songbird.bigquery

import ai.whylabs.songbird.logging.JsonLogging
import com.google.cloud.bigquery.BigQuery
import com.google.cloud.bigquery.FieldValueList
import com.google.cloud.bigquery.QueryJobConfiguration
import com.google.cloud.bigquery.TableResult
import io.micronaut.context.annotation.Factory
import jakarta.inject.Singleton

interface BigQueryService {
    fun query(sqlQuery: String): Sequence<FieldValueList>
}

@Factory
class BigQueryConfig {
    @Singleton
    fun bigQueryService(bigQueryService: BigQuery): BigQueryService {
        return BigQueryServiceImpl(bigQueryService)
    }
}

class BigQueryServiceImpl(private val bigQuery: BigQuery) : BigQueryService, JsonLogging {
    override fun query(sqlQuery: String): Sequence<FieldValueList> = sequence {
        try {
            val queryConfig = QueryJobConfiguration
                .newBuilder(sqlQuery)
                .build()
            val results: TableResult = bigQuery.query(queryConfig)
            val iterator = results.iterateAll().iterator()
            while (iterator.hasNext()) {
                yield(iterator.next())
            }
        } catch (e: Exception) {
            log.error("Query failed: $sqlQuery", e)
        }
    }
}

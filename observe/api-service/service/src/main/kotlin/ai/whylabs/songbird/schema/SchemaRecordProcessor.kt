package ai.whylabs.songbird.schema

import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.services.kinesis.clientlibrary.interfaces.IRecordProcessorCheckpointer
import com.amazonaws.services.kinesis.clientlibrary.interfaces.v2.IRecordProcessor
import com.amazonaws.services.kinesis.clientlibrary.interfaces.v2.IShutdownNotificationAware
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.ShutdownReason
import com.amazonaws.services.kinesis.clientlibrary.types.InitializationInput
import com.amazonaws.services.kinesis.clientlibrary.types.ProcessRecordsInput
import com.amazonaws.services.kinesis.clientlibrary.types.ShutdownInput
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import java.nio.charset.Charset

class SchemaRecordProcessor(private val entitySchemaStore: EntitySchemaStore) : IRecordProcessor, IShutdownNotificationAware, JsonLogging {
    private var shardId: String? = null
    private val mapper = jacksonObjectMapper()

    override fun initialize(initializationInput: InitializationInput) {
        shardId = initializationInput.shardId
    }

    override fun processRecords(processRecordsInput: ProcessRecordsInput) {
        processRecordsInput.records.forEach { record ->
            val data = mapper.readValue<RecordDataResult>(Charset.defaultCharset().decode(record.data).toString())
            if (data is DruidIngestionDataResult) {
                // process data record
                val schema = data.toEntitySchema()
                if (entitySchemaStore.hasNewColumns(data.orgId, data.datasetId, schema)) {
                    // check for denied entries in the schema update to log the kinesis record for debugging
                    schema.columns.keys.forEach { key ->
                        if (entitySchemaStore.isInColumnDenyList(data.orgId, data.datasetId, key)) {
                            log.error("Kinesis record contains column $key in deny list: ${Charset.defaultCharset().decode(record.data)}")
                        }
                    }
                    entitySchemaStore.storeEntitySchemaRecordUpdate(data.orgId, data.datasetId, schema)
                    log.info("Saved updated schema data for ${data.orgId} dataset ${data.datasetId}")
                }
            }
        }
        checkpoint(processRecordsInput.checkpointer)
    }

    override fun shutdown(shutdownInput: ShutdownInput) {
        if (shutdownInput.shutdownReason == ShutdownReason.TERMINATE) {
            checkpoint(shutdownInput.checkpointer)
        }
    }

    override fun shutdownRequested(checkpointer: IRecordProcessorCheckpointer) {
        checkpoint(checkpointer)
    }

    private fun checkpoint(checkpointer: IRecordProcessorCheckpointer) {
        checkpointer.checkpoint()
    }
}

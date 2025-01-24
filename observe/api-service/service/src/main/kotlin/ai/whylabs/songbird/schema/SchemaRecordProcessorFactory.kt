package ai.whylabs.songbird.schema

import com.amazonaws.services.kinesis.clientlibrary.interfaces.v2.IRecordProcessor
import com.amazonaws.services.kinesis.clientlibrary.interfaces.v2.IRecordProcessorFactory

class SchemaRecordProcessorFactory(private val entitySchemaStore: EntitySchemaStore) : IRecordProcessorFactory {
    override fun createProcessor(): IRecordProcessor {
        return SchemaRecordProcessor(entitySchemaStore)
    }
}

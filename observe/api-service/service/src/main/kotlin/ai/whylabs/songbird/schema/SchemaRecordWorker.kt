package ai.whylabs.songbird.schema

import ai.whylabs.songbird.EnvironmentConfig
import ai.whylabs.songbird.EnvironmentVariable
import ai.whylabs.songbird.logging.JsonLogging
import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.InitialPositionInStream
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.KinesisClientLibConfiguration
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.Worker
import io.micronaut.context.event.ApplicationEventListener
import io.micronaut.discovery.event.ServiceReadyEvent
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.net.InetAddress
import java.util.UUID

@Singleton
class SchemaRecordWorker @Inject constructor(
    private val environmentConfig: EnvironmentConfig,
    private val awsCredentialsProvider: AWSCredentialsProvider,
    private val entitySchemaStore: EntitySchemaStore,
) : ApplicationEventListener<ServiceReadyEvent>, JsonLogging {
    override fun onApplicationEvent(event: ServiceReadyEvent?) {
        if (environmentConfig.isECS()) {
            log.warn("Disabling background entity schema worker on ECS instance.")
            return
        }
        log.info("Starting schema worker")

        val streamName = environmentConfig.getEnv(EnvironmentVariable.DruidIngestionKinesisDataStream)
        val worker = Worker.Builder()
            .recordProcessorFactory(SchemaRecordProcessorFactory(entitySchemaStore))
            .config(
                @Suppress("DEPRECATION")
                KinesisClientLibConfiguration(
                    "${environmentConfig.getStage().toString().lowercase()}-schema-record-worker",
                    streamName,
                    awsCredentialsProvider,
                    awsCredentialsProvider,
                    awsCredentialsProvider,
                    InetAddress.getLocalHost().canonicalHostName + ":" + UUID.randomUUID(),
                ).withRegionName(environmentConfig.getRegion())
                    .withInitialLeaseTableReadCapacity(1)
                    .withInitialLeaseTableWriteCapacity(1)
                    .withInitialPositionInStream(InitialPositionInStream.TRIM_HORIZON)
            ).build()

        Runtime.getRuntime().addShutdownHook(
            Thread {
                try {
                    worker.startGracefulShutdown().get()
                } catch (e: Throwable) {
                    e.printStackTrace()
                }
            }
        )

        worker.run()
    }
}

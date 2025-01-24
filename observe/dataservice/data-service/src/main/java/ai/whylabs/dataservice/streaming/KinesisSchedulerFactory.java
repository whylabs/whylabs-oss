package ai.whylabs.dataservice.streaming;

import io.micronaut.context.annotation.Context;
import java.util.UUID;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.awssdk.services.cloudwatch.CloudWatchAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.kinesis.KinesisAsyncClient;
import software.amazon.kinesis.common.ConfigsBuilder;
import software.amazon.kinesis.coordinator.Scheduler;
import software.amazon.kinesis.retrieval.polling.PollingConfig;

@Slf4j
@Context
@RequiredArgsConstructor
public class KinesisSchedulerFactory {
  @Inject private final KinesisAsyncClient kinesisClient;
  @Inject private final DynamoDbAsyncClient ddb;
  @Inject private final CloudWatchAsyncClient cloudwatch;

  public Scheduler get(String topic, String appName, BaseKinesisRecordProcessor processor) {
    val configsBuilder =
        new ConfigsBuilder(
            topic,
            appName,
            kinesisClient,
            ddb,
            cloudwatch,
            UUID.randomUUID().toString(),
            () -> processor);

    return new Scheduler(
        configsBuilder.checkpointConfig(),
        configsBuilder.coordinatorConfig(),
        configsBuilder.leaseManagementConfig(),
        configsBuilder.lifecycleConfig(),
        configsBuilder.metricsConfig(),
        configsBuilder.processorConfig(),
        configsBuilder
            .retrievalConfig()
            .retrievalSpecificConfig(new PollingConfig(topic, kinesisClient)));
  }
}

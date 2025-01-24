package ai.whylabs.dataservice.streaming;

import ai.whylabs.dataservice.DataSvcConfig;
import io.micronaut.context.annotation.Context;
import io.micronaut.context.annotation.Requires;
import javax.annotation.PostConstruct;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Context
@RequiredArgsConstructor
@Requires(property = "whylabs.dataservice.enableBackfill", value = "true")
public class BulkIngestionStreamer {
  @Inject private final KinesisSchedulerFactory factory;
  @Inject private final DataSvcConfig config;
  @Inject private final BulkIngestionEventProcessor bulkIngestionEventProcessor;

  @PostConstruct
  public void start() {
    if (config.isEnableBackfill()) {
      String appName = config.getKinesisApplicationName() + this.getClass().getSimpleName();
      log.info("Backfill is enabled. Starting the record processor");
      log.info("Kinesis notification stream: {}", config.getPostgresBulkIngestionTriggerTopic());
      log.info("Kinesis application name: {}", appName);
      val scheduler =
          factory.get(
              config.getPostgresBulkIngestionTriggerTopic(), appName, bulkIngestionEventProcessor);
      val schedulerThread = new Thread(scheduler);
      schedulerThread.setDaemon(true);
      schedulerThread.start();
      log.info("Streaming has initialized");
    } else {
      log.info("Backfill is disabled");
    }
  }
}

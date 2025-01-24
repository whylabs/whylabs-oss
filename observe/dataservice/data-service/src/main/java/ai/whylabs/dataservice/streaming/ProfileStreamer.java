package ai.whylabs.dataservice.streaming;

import ai.whylabs.dataservice.DataSvcConfig;
import io.micronaut.context.annotation.Context;
import javax.annotation.PostConstruct;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * Listen to the kinesis topic of bin file upload notifications and trigger ingestion into postgres
 */
@Slf4j
@Context
@RequiredArgsConstructor
public class ProfileStreamer {
  @Inject private final KinesisSchedulerFactory factory;
  @Inject private final DataSvcConfig config;
  @Inject private final S3ProfileUploadProcessor s3ProfileUploadProcessor;

  @PostConstruct
  public void start() {
    if (config.isEnableKinesis()) {
      String appName = config.getKinesisApplicationName() + this.getClass().getSimpleName();
      log.info("Kinesis is enabled. Starting the record processor");
      log.info("Kinesis notification stream: {}", config.getProfileNotificationTopic());
      log.info("Kinesis application name: {}", appName);
      val scheduler =
          factory.get(config.getProfileNotificationTopic(), appName, s3ProfileUploadProcessor);
      val schedulerThread = new Thread(scheduler);
      schedulerThread.setDaemon(true);
      schedulerThread.start();

      log.info("Streaming has initialized");
    } else {
      log.info("Kinesis is disabled");
    }
  }
}

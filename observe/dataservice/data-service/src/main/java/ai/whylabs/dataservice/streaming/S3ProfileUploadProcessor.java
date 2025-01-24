package ai.whylabs.dataservice.streaming;

import ai.whylabs.dataservice.services.ProfileService;
import io.micrometer.core.instrument.MeterRegistry;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.StandardCharsets;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.kinesis.lifecycle.events.LeaseLostInput;
import software.amazon.kinesis.lifecycle.events.ProcessRecordsInput;
import software.amazon.kinesis.lifecycle.events.ShardEndedInput;
import software.amazon.kinesis.lifecycle.events.ShutdownRequestedInput;
import software.amazon.kinesis.processor.RecordProcessorCheckpointer;
import software.amazon.kinesis.retrieval.KinesisClientRecord;

@Singleton
@Slf4j
@RequiredArgsConstructor
public class S3ProfileUploadProcessor extends BaseKinesisRecordProcessor {
  private static final CharsetDecoder DECODER = StandardCharsets.UTF_8.newDecoder();
  @Inject private final ProfileService profileService;

  @Inject private final MeterRegistry meterRegistry;

  @Override
  public void processRecords(ProcessRecordsInput processRecordsInput) {
    meterRegistry
        .counter("whylabs.kinesis.records.count")
        .increment(processRecordsInput.records().size());
    for (KinesisClientRecord record : processRecordsInput.records()) {
      processSingleRecord(record);
    }

    // Checkpoint after processing the batch
    checkpoint(processRecordsInput.checkpointer());
  }

  private void processSingleRecord(KinesisClientRecord record) {
    try {
      val json = DECODER.decode(record.data()).toString();
      val parser = new S3UploadNotificationParser(json);

      val path = parser.getPathFromS3UploadCloudTrailNotification();
      if (path != null) {
        val eventTime = parser.geteventTime();
        profileService.indexProfile(path, "processRecords", eventTime);
      }
      meterRegistry.counter("whylabs.kinesis.records.processed").increment();
    } catch (IllegalStateException e) {
      meterRegistry.counter("whylabs.kinesis.records.invalid").increment();
      log.warn("Unable to decode kinesis record", e);
    } catch (Exception e) {
      log.error("Error processing kinesis record", e);
      meterRegistry.counter("whylabs.kinesis.records.error").increment();
    }
  }

  private void checkpoint(RecordProcessorCheckpointer checkpointer) {
    try {
      checkpointer.checkpoint();
    } catch (Exception e) {
      log.error("Kinesis checkpoint failed: ", e);
    }
  }

  @Override
  public void leaseLost(LeaseLostInput leaseLostInput) {
    log.info("Lost lease, terminating.");
  }

  @Override
  public void shardEnded(ShardEndedInput shardEndedInput) {
    log.info("Shard ended, checkpointing.");
    try {
      shardEndedInput.checkpointer().checkpoint();
    } catch (Exception e) {
      log.error("Failed to checkpoint at shard end:", e);
    }
  }

  @Override
  public void shutdownRequested(ShutdownRequestedInput shutdownRequestedInput) {
    log.info("Scheduler is shutting down, checkpointing.");
    try {
      shutdownRequestedInput.checkpointer().checkpoint();
    } catch (Exception e) {
      log.error("Failed to checkpoint during shutdown: " + e.getMessage());
    }
  }
}

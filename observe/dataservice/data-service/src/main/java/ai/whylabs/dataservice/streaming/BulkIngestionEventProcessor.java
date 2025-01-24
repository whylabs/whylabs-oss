package ai.whylabs.dataservice.streaming;

import ai.whylabs.core.structures.PostgresBulkIngestionTrigger;
import ai.whylabs.dataservice.controllers.BulkLoadController;
import ai.whylabs.dataservice.exceptions.DuplicateRequestDetectedException;
import ai.whylabs.dataservice.requests.parquet.ParquetIngestionRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.context.annotation.Requires;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import javax.inject.Inject;
import javax.inject.Singleton;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.kinesis.lifecycle.events.ProcessRecordsInput;

@Singleton
@Slf4j
@RequiredArgsConstructor
@Requires(property = "whylabs.dataservice.enableBackfill", value = "true")
public class BulkIngestionEventProcessor extends BaseKinesisRecordProcessor {

  @Inject private BulkLoadController bulkLoadController;
  private ObjectMapper objectMapper;
  private static final CharsetDecoder DECODER = StandardCharsets.UTF_8.newDecoder();

  @SneakyThrows
  public void processRecords(ProcessRecordsInput processRecordsInput) {
    if (objectMapper == null) {
      // Got classpath issues when using the object mapper from BeansFactory, which instantiating
      // here works around
      objectMapper = new ObjectMapper();
    }
    for (val r : processRecordsInput.records()) {
      val json = DECODER.decode(r.data()).toString();
      log.info("Bulk ingestion request received {}", json);
      val trigger = objectMapper.readValue(json, PostgresBulkIngestionTrigger.class);
      /** We need to dedupe duplicate insert requests */
      val dedupeKey = UUID.randomUUID();
      val ingestionRequest = new ParquetIngestionRequest();
      ingestionRequest.setPath(trigger.getPath());
      ingestionRequest.setRequestedTs(trigger.getRequestedTs());
      ingestionRequest.setRunId(trigger.getRunId());
      ingestionRequest.setAsync(trigger.isAsync());
      ingestionRequest.setDedupeKey(Optional.of(dedupeKey));
      ingestionRequest.setColumns(trigger.getColumns());
      ingestionRequest.setCutoverTimestamp(trigger.getCutoverTimestamp());
      ingestionRequest.setOrgId(Optional.ofNullable(trigger.orgId));
      ingestionRequest.setTargetTable(trigger.getTargetTable());

      try {
        switch (trigger.targetTable) {
          case ANALYZER_RUNS:
            log.info("Initiating bulk load for analyzer runs");
            bulkLoadController.insertAnalyzerRuns(ingestionRequest, trigger.getMode());
            break;
          case ANALYZER_RESULTS:
            log.info("Initiating bulk load for analyzer results");
            val results =
                bulkLoadController.insertAnalyzerResults(ingestionRequest, trigger.getMode());
            if (results.getStatus().getCode() == 500) {
              throw new RuntimeException(
                  "Failure to ingest "
                      + ingestionRequest
                      + " within an hour. Throwing an exception so this event can be retried");
            }
            break;
        }
      } catch (DuplicateRequestDetectedException e) {
        log.warn("Duplicate request detected, processing skipped " + ingestionRequest, e);
      }
    }
  }
}

package ai.whylabs.batch.sinks;

import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.PostgresBulkIngestionTrigger;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kinesis.KinesisClient;
import software.amazon.awssdk.services.kinesis.model.PutRecordRequest;

@Slf4j
public class PostgresBulkIngestionTriggerSink {
  private KinesisClient producer;
  private String postgresBulkIngestionTriggerTopic;
  private ObjectMapper mapper;

  public PostgresBulkIngestionTriggerSink(String postgresBulkIngestionTriggerTopic) {
    this.postgresBulkIngestionTriggerTopic = postgresBulkIngestionTriggerTopic;
    mapper = new ObjectMapper();
    MonitorConfigV3JsonSerde.configureMapper(mapper);
  }

  @SneakyThrows
  public void send(List<PostgresBulkIngestionTrigger> trigger) {
    if (producer == null && postgresBulkIngestionTriggerTopic != null) {
      producer =
          KinesisClient.builder()
              .httpClient(ApacheHttpClient.create())
              .region(Region.US_WEST_2)
              .build();
    }

    for (val t : trigger) {
      String json = mapper.writeValueAsString(t);
      log.info(json);
      if (producer != null) {
        val p =
            PutRecordRequest.builder()
                .partitionKey(UUID.randomUUID().toString())
                .streamName(postgresBulkIngestionTriggerTopic)
                .data(SdkBytes.fromByteArray(json.getBytes(StandardCharsets.UTF_8)))
                .build();
        val r = producer.putRecord(p);
        if (!r.sdkHttpResponse().isSuccessful()) {
          log.error("Error publishing to kinesis {}", r.sdkHttpResponse());
        }
      } else {
        log.info("postgresBulkIngestionTriggerTopic not configured, no-op");
      }
    }
  }
}

package ai.whylabs.ingestion.sinks;

import ai.whylabs.ingestion.payloads.ProfileReadRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import lombok.SneakyThrows;
import lombok.val;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kinesis.KinesisClient;
import software.amazon.awssdk.services.kinesis.model.PutRecordsRequest;
import software.amazon.awssdk.services.kinesis.model.PutRecordsRequestEntry;

/**
 * Publish an event that triggers the ProfileReaderLambda to read a bin file and publish its
 * contents over a message bus (currently kinesis)
 */
public class ProfileReadRequestSink {
  public static final ObjectMapper MAPPER = new ObjectMapper();
  private KinesisClient kinesisClient =
      KinesisClient.builder()
          .httpClient(ApacheHttpClient.create())
          .region(Region.US_WEST_2)
          .build();

  @SneakyThrows
  public void send(ProfileReadRequest trigger, String topic) {
    String json = MAPPER.writeValueAsString(trigger);
    val r =
        PutRecordsRequest.builder()
            .streamName(topic)
            .records(
                PutRecordsRequestEntry.builder()
                    .data(SdkBytes.fromByteArray(json.getBytes(StandardCharsets.UTF_8)))
                    // Round robin fanout
                    .partitionKey(UUID.randomUUID().toString())
                    .build())
            .build();
    kinesisClient.putRecords(r);
  }
}

package ai.whylabs.dataservice.sinks;

import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.util.SirenEventSerde;
import com.amazonaws.services.sqs.AmazonSQSAsync;
import com.amazonaws.services.sqs.model.SendMessageRequest;
import com.shaded.whylabs.com.google.common.annotations.VisibleForTesting;
import jakarta.inject.Singleton;
import java.util.List;
import javax.inject.Inject;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Singleton
@NoArgsConstructor
public class SirenSqsSink {
  @Inject private AmazonSQSAsync sqsAsyncClient;
  @Inject private SirenEventSerde sirenEventJsonSerde;

  private static final int STAT_MAX = 100;
  public static final int MAX_MESSAGE_SIZE_BYTES =
      262144 - 2000; // Max SQS message size minus some padding

  public void send(String topic, List<SirenDigestPayload> payloads) {

    for (val p : payloads) {
      send(topic, p);
    }
  }

  public void send(String topic, SirenDigestPayload p) {
    String json = trimAndEncodeToJson(p);
    if (json.getBytes().length > MAX_MESSAGE_SIZE_BYTES) {
      throw new IllegalArgumentException(
          "Payload still too large for SQS even after trimming sample size: " + json);
    }
    send(topic, json);
  }

  public void send(String topic, SirenEveryAnomalyPayload p) {
    String json = sirenEventJsonSerde.toJsonString(p);
    send(topic, json);
  }

  @VisibleForTesting
  public void send(String topic, String msg) {
    val queueUrl = sqsAsyncClient.getQueueUrl(topic.replace("\"", ""));
    SendMessageRequest send_msg_request =
        new SendMessageRequest().withQueueUrl(queueUrl.getQueueUrl()).withMessageBody(msg);
    val r = sqsAsyncClient.sendMessage(send_msg_request);
    if (r.getSdkHttpMetadata().getHttpStatusCode() != 200) {
      log.warn("{} code publishing to sqs", r.getSdkHttpMetadata().getHttpStatusCode());
    } else {
      log.info("Published to SQS: {}, response {}", msg, r.toString());
    }
  }

  /**
   * Analyzer result samples vary in size so if we're exceeding the max SQS payload size then we
   * need to trim down the sample size until we have a payload that can fit on the message bus.
   */
  public String trimAndEncodeToJson(SirenDigestPayload p) {
    // Crop the statistics incase there's 5k columns or 5k segments
    if (p.getSegmentStatistics() != null && p.getSegmentStatistics().size() > STAT_MAX) {
      p.setSegmentStatistics(p.getSegmentStatistics().subList(0, STAT_MAX));
    }
    if (p.getColumnStatistics() != null && p.getColumnStatistics().size() > STAT_MAX) {
      p.setColumnStatistics(p.getColumnStatistics().subList(0, STAT_MAX));
    }

    String json = sirenEventJsonSerde.toJsonString(p);
    while (json.getBytes().length > MAX_MESSAGE_SIZE_BYTES) {
      List<AnalyzerResult> sample = p.getAnomalySample();
      int l = sample.size() / 2;
      if (l < 2) {
        // Sanity check
        break;
      }
      sample = sample.subList(0, l);
      p.setAnomalySample(sample);
      json = sirenEventJsonSerde.toJsonString(p);
    }
    return json;
  }
}

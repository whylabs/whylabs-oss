package ai.whylabs.core.siren;

import ai.whylabs.core.serde.SirenEventSerde;
import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.amazonaws.services.sqs.AmazonSQS;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.amazonaws.services.sqs.model.SendMessageRequest;
import jakarta.inject.Inject;
import java.io.Serializable;
import java.util.List;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Singleton
public class SirenSqsDigestSink implements Serializable {
  @Inject private AmazonSQS sqs;

  private String nearRealTimeAlertSqsTopic;
  private transient SirenEventSerde sirenEventJsonSerde = new SirenEventSerde();
  private final int STAT_MAX = 100;
  public static final int MAX_MESSAGE_SIZE_BYTES =
      262144 - 2000; // Max SQS message size minus some padding

  public SirenSqsDigestSink(String nearRealTimeAlertSqsTopic) {
    this.nearRealTimeAlertSqsTopic = nearRealTimeAlertSqsTopic;
  }

  public void send(List<SirenDigestPayload> payloads) throws Exception {
    if (sqs == null) {
      // For when running in a spark context
      sqs = AmazonSQSClientBuilder.defaultClient();
    }
    for (val p : payloads) {
      String json = trimAndEncodeToJson(p);
      if (json.getBytes().length > MAX_MESSAGE_SIZE_BYTES) {
        throw new IllegalArgumentException(
            "Payload still too large for SQS even after trimming sample size: " + json);
      }
      SendMessageRequest send_msg_request =
          new SendMessageRequest().withQueueUrl(nearRealTimeAlertSqsTopic).withMessageBody(json);
      val r = sqs.sendMessage(send_msg_request);
      if (r.getSdkHttpMetadata().getHttpStatusCode() != 200) {
        log.warn("{} code publishing to sqs", r.getSdkHttpMetadata().getHttpStatusCode());
      } else {
        log.info("Published to SQS: {}, response {}", p, r.toString());
      }
    }
  }

  /**
   * Analyzer result samples vary in size so if we're exceeding the max SQS payload size then we
   * need to trim down the sample size until we have a payload that can fit on the message bus.
   */
  public String trimAndEncodeToJson(SirenDigestPayload p) {
    if (sirenEventJsonSerde == null) {
      sirenEventJsonSerde = new SirenEventSerde();
    }
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

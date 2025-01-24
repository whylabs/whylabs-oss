package ai.whylabs.core.siren;

import ai.whylabs.core.serde.SirenEventSerde;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import com.amazonaws.services.sqs.AmazonSQS;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.amazonaws.services.sqs.model.SendMessageRequest;
import java.io.Serializable;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class SirenSqsEveryAnomalySink implements Serializable {
  private transient AmazonSQS sqs;
  private String nearRealTimeAlertSqsTopic;
  private transient SirenEventSerde sirenEventJsonSerde;

  public SirenSqsEveryAnomalySink(String nearRealTimeAlertSqsTopic) {
    this.nearRealTimeAlertSqsTopic = nearRealTimeAlertSqsTopic;
  }

  public void send(List<SirenEveryAnomalyPayload> payload) throws Exception {
    if (sqs == null) {
      sqs = AmazonSQSClientBuilder.defaultClient();
      sirenEventJsonSerde = new SirenEventSerde();
    }

    for (val p : payload) {
      String json = sirenEventJsonSerde.toJsonString(p);
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
}

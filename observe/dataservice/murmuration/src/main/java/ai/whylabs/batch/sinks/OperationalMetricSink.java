package ai.whylabs.batch.sinks;

import ai.whylabs.druid.whylogs.operationalMetrics.OperationalMetric;
import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.services.kinesis.producer.KinesisProducer;
import com.amazonaws.services.kinesis.producer.KinesisProducerConfiguration;
import com.google.gson.Gson;
import java.io.Serializable;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.api.java.function.ForeachPartitionFunction;

@Slf4j
@AllArgsConstructor
public class OperationalMetricSink
    implements ForeachPartitionFunction<OperationalMetric>, Serializable {
  public static final String REGION = "us-west-2";
  private String kinesisTopic;
  private transient Gson GSON;
  private transient KinesisProducer producer;

  public OperationalMetricSink(String kinesisTopic) {
    this.kinesisTopic = kinesisTopic;
  }

  @Override
  public void call(Iterator<OperationalMetric> metrics) throws Exception {
    while (metrics.hasNext()) {
      publishOperationalMetric(metrics.next());
    }
    if (producer != null) {
      producer.flushSync();
    }
  }

  private void publishOperationalMetric(OperationalMetric operationalMetric) {
    if (kinesisTopic != null) {
      if (producer == null) {
        KinesisProducerConfiguration conf =
            new KinesisProducerConfiguration()
                .setRegion(REGION)
                .setCredentialsProvider(new DefaultAWSCredentialsProviderChain());
        producer = new KinesisProducer(conf);
        GSON = new Gson();
      }

      String metricJson = GSON.toJson(operationalMetric);
      producer.addUserRecord(
          kinesisTopic,
          operationalMetric.getOrgId(),
          ByteBuffer.wrap(metricJson.getBytes(StandardCharsets.UTF_8)));

    } else {
      log.info("kinesisTopic unconfigured, no op metrics will be published");
    }
  }
}

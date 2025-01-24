package ai.whylabs.dataservice.streaming;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.services.kinesis.producer.KinesisProducer;
import com.amazonaws.services.kinesis.producer.KinesisProducerConfiguration;

public class KinesisProducerFactory {
  public static final String REGION = "us-west-2";

  private static KinesisProducerConfiguration conf =
      new KinesisProducerConfiguration()
          .setRegion(REGION)
          .setCredentialsProvider(new DefaultAWSCredentialsProviderChain());
  private static KinesisProducer producer = new KinesisProducer(conf);

  public static KinesisProducer get() {
    return producer;
  }
}

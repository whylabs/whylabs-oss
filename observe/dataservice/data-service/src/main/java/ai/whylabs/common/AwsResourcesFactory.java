package ai.whylabs.common;

import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import com.amazonaws.ClientConfiguration;
import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.sqs.AmazonSQS;
import com.amazonaws.services.sqs.AmazonSQSClientBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.context.annotation.Factory;
import javax.inject.Named;
import javax.inject.Singleton;
import lombok.val;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchAsyncClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbAsyncClient;
import software.amazon.awssdk.services.kinesis.KinesisAsyncClient;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.kinesis.common.KinesisClientUtil;

@Factory
public class AwsResourcesFactory {

  public static final Integer MAX_S3_CONNECTIONS = 300;

  @Singleton
  public AwsCredentialsProvider awsCredentialsProvider() {
    return WhyLabsCredentialsProviderChain.getInstance();
  }

  @Singleton
  public AWSCredentialsProvider v1AwsCredentialsProvider() {
    return WhyLabsCredentialsProviderChain.getInstance();
  }

  @Singleton
  @Named("awsAccountId")
  public String awsAccountId(AwsCredentialsProvider creds, Region region) {
    // create an sts client
    val stsClient = StsClient.builder().credentialsProvider(creds).region(region).build();

    return stsClient.getCallerIdentity().account();
  }

  @Singleton
  public Region awsRegion() {
    return Region.US_WEST_2;
  }

  @Singleton
  public SecretsManagerClient awsSecretsManagerClient(
      AwsCredentialsProvider credentialsProvider, Region region) {
    return SecretsManagerClient.builder()
        .credentialsProvider(credentialsProvider)
        .region(region)
        .httpClient(ApacheHttpClient.create())
        .build();
  }

  @Singleton
  public KinesisAsyncClient kinesisAsyncClient(
      AwsCredentialsProvider credentialsProvider, Region region) {

    return KinesisClientUtil.createKinesisAsyncClient(
        KinesisAsyncClient.builder().credentialsProvider(credentialsProvider).region(region));
  }

  @Singleton
  public DynamoDbAsyncClient dynamoDbAsyncClient(
      AwsCredentialsProvider credentialsProvider, Region region) {
    return DynamoDbAsyncClient.builder()
        .region(region)
        .credentialsProvider(credentialsProvider)
        .build();
  }

  @Singleton
  public CloudWatchAsyncClient cloudWatchAsyncClient(
      AwsCredentialsProvider credentialsProvider, Region region) {
    return CloudWatchAsyncClient.builder()
        .region(region)
        .credentialsProvider(credentialsProvider)
        .build();
  }

  @Singleton
  public AmazonSQS sqsClientV1(AWSCredentialsProvider credentialsProvider, Region region) {
    return AmazonSQSClientBuilder.standard()
        .withRegion(region.toString())
        .withCredentials(credentialsProvider)
        .build();
  }

  @Singleton
  public AmazonS3 getS3Client(AWSCredentialsProvider credentialsProvider, Region region) {
    return AmazonS3Client.builder()
        .withCredentials(credentialsProvider)
        .withClientConfiguration(new ClientConfiguration().withMaxConnections(MAX_S3_CONNECTIONS))
        .withRegion(region.toString())
        .build();
  }

  @Singleton
  public ObjectMapper objectMapper() {
    return new ObjectMapper();
  }
}

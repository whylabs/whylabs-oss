package ai.whylabs.ingestion;

import ai.whylabs.core.aws.WhyLabsCredentialsProviderChain;
import com.amazonaws.ClientConfiguration;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.AmazonS3URI;
import javax.annotation.Nullable;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class S3ClientFactory {
  private static final String DEFAULT_REGION = "us-west-2";
  private static transient AmazonS3 s3Client;
  public static final Integer MAX_S3_CONNECTIONS = 300;

  public static AmazonS3 getS3Client() {
    if (s3Client == null) {
      s3Client =
          AmazonS3Client.builder()
              .withCredentials(WhyLabsCredentialsProviderChain.getInstance())
              .withClientConfiguration(
                  new ClientConfiguration().withMaxConnections(MAX_S3_CONNECTIONS))
              .withRegion(DEFAULT_REGION)
              .build();
    }
    return s3Client;
  }

  private final AmazonS3 s3;

  public S3ClientFactory(@Nullable AmazonS3 s3) {
    if (s3 == null) {
      this.s3 = getS3Client();
    } else {
      this.s3 = s3;
    }
  }

  @SneakyThrows
  public S3ObjectWrapper get(String s3Path) {
    AmazonS3URI s3URI = new AmazonS3URI(s3Path);
    try {
      val object = s3.getObject(s3URI.getBucket(), s3URI.getKey());
      return new S3ObjectWrapper(object);
    } catch (Exception e) {
      // don't let permissions errors derail the results.
      log.error("Error retrieving file " + s3Path, e);
    }
    return null;
  }
}

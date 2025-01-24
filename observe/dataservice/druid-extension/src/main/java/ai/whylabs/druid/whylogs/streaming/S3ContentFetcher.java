package ai.whylabs.druid.whylogs.streaming;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.AmazonS3URI;
import lombok.SneakyThrows;

public class S3ContentFetcher {

  private static transient AmazonS3 s3Client;

  public AmazonS3 getS3Client() {
    if (s3Client == null) {
      s3Client = AmazonS3ClientBuilder.defaultClient();
    }
    return s3Client;
  }

  @SneakyThrows
  public S3ObjectWrapper get(String s3Path) {
    AmazonS3URI s3URI = new AmazonS3URI(s3Path);
    return new S3ObjectWrapper(getS3Client().getObject(s3URI.getBucket(), s3URI.getKey()));
  }
}

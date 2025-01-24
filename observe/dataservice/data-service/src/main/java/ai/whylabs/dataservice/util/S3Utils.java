package ai.whylabs.dataservice.util;

import com.amazonaws.HttpMethod;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.*;
import java.net.URL;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import lombok.val;

public class S3Utils {

  public static URL createPresignedDownload(AmazonS3 s3, String bucket, String key) {
    return createPresignedDownload(s3, bucket, key, Duration.ofMinutes(15));
  }

  public static URL createPresignedDownload(
      AmazonS3 s3, String bucket, String key, Duration duration) {
    final Date expirationTime = Date.from(Instant.now().plus(duration));

    val presignedUrlRequest =
        new GeneratePresignedUrlRequest(bucket, key)
            .withMethod(HttpMethod.GET)
            .withExpiration(expirationTime);
    return s3.generatePresignedUrl(presignedUrlRequest);
  }
}

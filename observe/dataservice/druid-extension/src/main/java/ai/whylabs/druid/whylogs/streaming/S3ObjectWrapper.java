package ai.whylabs.druid.whylogs.streaming;

import com.amazonaws.services.s3.model.S3Object;
import java.io.BufferedInputStream;
import java.io.InputStream;

public class S3ObjectWrapper {

  private S3Object object;

  public S3ObjectWrapper(S3Object object) {
    this.object = object;
  }

  public long getContentLength() {
    return object.getObjectMetadata().getContentLength();
  }

  public InputStream getContentStream() {
    return new BufferedInputStream(object.getObjectContent(), StreamingConstants.ONE_MEGABYTE);
  }
}

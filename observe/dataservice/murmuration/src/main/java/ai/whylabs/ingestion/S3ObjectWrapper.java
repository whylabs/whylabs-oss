package ai.whylabs.ingestion;

import ai.whylabs.druid.whylogs.streaming.StreamingConstants;
import com.amazonaws.services.s3.model.S3Object;
import java.io.BufferedInputStream;
import java.io.InputStream;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class S3ObjectWrapper {

  private final S3Object object;

  public long getContentLength() {
    return object.getObjectMetadata().getContentLength();
  }

  public long getModifiedTimestamp() {
    return this.object.getObjectMetadata().getLastModified().toInstant().toEpochMilli();
  }

  public InputStream getContentStream() {
    return new BufferedInputStream(object.getObjectContent(), StreamingConstants.ONE_MEGABYTE);
  }

  public InputStream getContentStreamSmallBuffer() {
    return new BufferedInputStream(object.getObjectContent(), StreamingConstants.TEN_KB);
  }
}

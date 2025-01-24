package ai.whylabs.dataservice.streaming;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;

class S3UploadNotificationParserTest {

  @SneakyThrows
  @Test
  public void test() throws InvalidProtocolBufferException {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass()
                    .getResourceAsStream(
                        "/upload_notifications/kinesisS3_error_notification.json")),
            StandardCharsets.UTF_8);

    S3UploadNotificationParser parser = new S3UploadNotificationParser(json);
    String path = parser.getPathFromS3UploadCloudTrailNotification();
    // parser should ignore S3 notifications that contain error code.
    assertNull(path);

    json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass()
                    .getResourceAsStream("/upload_notifications/kinesisS3_notification.json")),
            StandardCharsets.UTF_8);

    parser = new S3UploadNotificationParser(json);
    path = parser.getPathFromS3UploadCloudTrailNotification();
    // same notification without error code yields a single S3 path
    assertThat(
        path,
        is(
            "s3://development-songbird-20201028054020481800000001/daily-log-untrusted/2021-06-22/org-9758-model-1-8YXecPveYrs0GbrSlHbo7hw6CW6gyKLM.bin"));
  }
}

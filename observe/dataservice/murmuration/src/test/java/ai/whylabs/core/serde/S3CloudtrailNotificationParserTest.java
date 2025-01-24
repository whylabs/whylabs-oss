package ai.whylabs.core.serde;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.is;
import static org.testng.Assert.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;
import lombok.SneakyThrows;
import org.apache.commons.io.IOUtils;
import org.testng.annotations.Test;

public class S3CloudtrailNotificationParserTest {

  @Test
  @SneakyThrows
  public void testCloudtrailArchiveParsing() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/upload_notifications/cloudtrail_archive.json")),
            StandardCharsets.UTF_8);

    S3CloudtrailNotificationParser parser = new S3CloudtrailNotificationParser();
    List<String> paths = parser.getS3Paths(json);
    // there are actually three notifications in the archive, but one has an error during upload, so
    // expect only 2 results.
    assertThat(paths.size(), is(2));
    assertThat(
        paths,
        containsInAnyOrder(
            "s3://songbird-20201223060057342600000001/daily-log-untrusted/2023-09-17/org-mV4Rxz-model-2-2023-09-17T141500-FM3nTedPCc6ESWfKGTlcOE6kSVnHbTk8.bin",
            "s3://songbird-20201223060057342600000001/daily-log-untrusted/2023-09-17/org-mV4Rxz-model-3-2023-09-17T141500-tAYGWCYXo20RouavS8zkZGqt0nNFlDHh.bin"));
  }
}

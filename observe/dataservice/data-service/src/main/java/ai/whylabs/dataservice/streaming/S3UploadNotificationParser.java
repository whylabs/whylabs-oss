package ai.whylabs.dataservice.streaming;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.DateTime;

/** Parse Cloudtrail notifications for S3 uploads */
@Slf4j
public class S3UploadNotificationParser {

  private static final String JSON_SUFFIX = ".json";
  private static final String ERRORCODE = "errorCode";
  private static final String ERRORMESSAGE = "errorMessage";

  private final JsonObject detail;

  /**
   * Create a parser for Kinesis S3 Upload notification.
   *
   * <p>Note the notifications delivered via kinesis are based on CloudTrail notifications, but they
   * are slightly different! The Kinesis message packages only a single CloudTrail notification per
   * message, and it nests the CW notification under the "detail" key. This class parses the Kinesis
   * messages, but cannot be used to parse archived CloudTrail notifications.
   */
  public S3UploadNotificationParser(String json) {
    val notification = JsonParser.parseString(json).getAsJsonObject();
    this.detail = notification.getAsJsonObject("detail");
  }

  public Long geteventTime() {
    return DateTime.parse(detail.get("eventTime").getAsString()).getMillis();
  }

  public boolean hasError() {
    return detail.get(ERRORCODE) != null;
  }

  public String getErrorMsg() {
    return detail.get(ERRORCODE).getAsString() + ": " + detail.get(ERRORMESSAGE).getAsString();
  }

  /** Pluck out the S3 paths from a cloudtrail S3 upload event json structure */
  public String getPathFromS3UploadCloudTrailNotification() {
    // Previously this parsed the "resources" key, but that key contains extraneous objects for
    // "CopyObject"
    // notifications, like the source of the copy. Better to use "requestParameters" key as that
    // works with both
    // "PutObject" and "CopyObject" notifications.

    final JsonObject params = detail.get("requestParameters").getAsJsonObject();
    final String bucketName = params.get("bucketName").getAsString();
    final String key = params.get("key").getAsString();
    final String s3Path = "s3://" + bucketName + "/" + key;
    if (s3Path.endsWith(JSON_SUFFIX)) {
      return null;
    }
    // ignore notifications that indicate an error during upload.
    if (hasError()) {
      //  check for error after constructing path to provide useful debugging info.
      log.warn("{}\nskip {}", getErrorMsg(), s3Path);
      return null;
    }
    return s3Path;
  }
}

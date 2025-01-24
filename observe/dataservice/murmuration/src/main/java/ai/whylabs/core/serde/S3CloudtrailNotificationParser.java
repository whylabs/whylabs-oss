package ai.whylabs.core.serde;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/** From an s3 upload notification message from aws, pluck out the s3 paths */
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class S3CloudtrailNotificationParser {
  private String orgId;
  private String datasetId;
  private static final String ERRORCODE = "errorCode";
  private static final String ERRORMESSAGE = "errorMessage";
  public static final String RECORDS = "Records";
  public static final String BIN_EXT = ".bin";
  public static final String ZIP_EXT = ".zip";

  /**
   * Gather all S3 paths for binary profiles in archived cloud notification.
   *
   * <p>NOTE parses ARCHIVED cloudtrail notifications - slightly different from kinesis
   * notifications. Cloudtrail archives aggregates notifications together under "Records": []. Each
   * record contains what would be found under the "detail" key in a real kinesis notification.
   */
  public List<String> getS3Paths(String s3UploadNotification) {
    List<String> binFiles = new ArrayList<>();
    val records =
        new JsonParser()
            .parse(s3UploadNotification)
            .getAsJsonObject()
            .get(RECORDS)
            .getAsJsonArray();
    for (JsonElement r : records) {
      // Each archived record is a single cloudtrail notification.
      //
      // This used to parse the "resources" key, but that key contains extraneous objects for
      // "CopyObject"
      // notifications, like the source of the copy.
      //
      // Better to use "requestParameters" key as that works with both "PutObject" and "CopyObject"
      // notifications.
      final JsonObject obj = r.getAsJsonObject();
      final JsonObject params = obj.get("requestParameters").getAsJsonObject();
      final String bucketName = params.get("bucketName").getAsString();
      final String key = params.get("key").getAsString();
      final String s3Path = "s3://" + bucketName + "/" + key;
      if (!(s3Path.endsWith(BIN_EXT) || s3Path.endsWith(ZIP_EXT))) {
        continue;
      }
      // ignore notifications that indicate an error during upload.
      if (obj.get(ERRORCODE) != null) {
        val errMsg = obj.get(ERRORCODE).getAsString() + ": " + obj.get(ERRORMESSAGE).getAsString();
        log.warn("%s\nskip %s", errMsg, s3Path);
        continue;
      }

      // Filter by org/dataset if desired
      if (orgId != null && !s3Path.contains(orgId)) {
        continue;
      }
      if (datasetId != null && !s3Path.contains(datasetId)) {
        continue;
      }
      binFiles.add(s3Path);
    }
    return binFiles;
  }
}

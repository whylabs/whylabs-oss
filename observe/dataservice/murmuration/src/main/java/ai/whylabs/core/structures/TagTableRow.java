package ai.whylabs.core.structures;

import ai.whylabs.batch.MapFunctions.DatalakeRowV1ToCsv;
import java.sql.Timestamp;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class TagTableRow {
  private String org_id;
  private String dataset_id;
  private String tag_key;
  private String tag_value;
  private Long latest_dataset_timestamp;
  private Long oldest_dataset_timestamp;
  private Long latest_upload_timestamp;
  private Long oldest_upload_timestamp;

  public String toCsv() {
    StringBuilder sb = new StringBuilder();
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(org_id)).append("\",");
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(dataset_id)).append("\",");
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(tag_key)).append("\",");
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(tag_value)).append("\",");
    sb.append("\"").append(toTimestamp(latest_dataset_timestamp)).append("\",");
    sb.append("\"").append(toTimestamp(oldest_dataset_timestamp)).append("\",");
    sb.append("\"").append(toTimestamp(latest_upload_timestamp)).append("\",");
    sb.append("\"").append(toTimestamp(oldest_upload_timestamp)).append("\"");
    return sb.toString();
  }

  public static String toTimestamp(Long ts) {
    if (ts == null) {
      return null;
    }

    return Timestamp.from(Instant.ofEpochMilli(ts)).toString();
  }
}

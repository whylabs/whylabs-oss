package ai.whylabs.core.structures;

import ai.whylabs.batch.MapFunctions.DatalakeRowV1ToCsv;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class LegacySegmentTableEntry {
  private String org_id;
  private String dataset_id;
  private String segment_text;
  private Long latest_dataset_timestamp;
  private Long oldest_dataset_timestamp;
  private Long latest_upload_timestamp;
  private Long oldest_upload_timestamp;

  public String toCsv() {
    StringBuilder sb = new StringBuilder();
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(org_id)).append("\",");
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(dataset_id)).append("\",");
    sb.append("\"").append(DatalakeRowV1ToCsv.escapeString(segment_text)).append("\",");
    sb.append("\"").append(TagTableRow.toTimestamp(latest_dataset_timestamp)).append("\",");
    sb.append("\"").append(TagTableRow.toTimestamp(oldest_dataset_timestamp)).append("\",");
    sb.append("\"").append(TagTableRow.toTimestamp(latest_upload_timestamp)).append("\",");
    sb.append("\"").append(TagTableRow.toTimestamp(oldest_upload_timestamp)).append("\"");
    return sb.toString();
  }
}

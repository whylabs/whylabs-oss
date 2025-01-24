package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.structures.DatalakeRowV1;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.apache.spark.api.java.function.MapFunction;

public class DatalakeRowV1ToCsv implements MapFunction<DatalakeRowV1, String> {

  public static final List<String> COLUMNS =
      Arrays.asList(
          "org_id",
          "dataset_id",
          "column_name",
          "metric_path",
          "segment_text",
          "dataset_tags",
          "dataset_timestamp",
          "variance_0",
          "variance_1",
          "variance_2",
          "d_sum",
          "d_min",
          "d_max",
          "unmergeable_d",
          "n_sum",
          "n_min",
          "n_max",
          "upload_audit",
          "dataset_type",
          "mergeable_segment",
          "kll",
          "hll",
          "frequent_items",
          "classification_profile",
          "regression_profile",
          "last_upload_ts",
          "original_filename",
          "reference_profile_id",
          "ingestion_origin",
          "datalake_write_ts");

  private ObjectMapper mapper;

  public DatalakeRowV1ToCsv() {
    mapper = new ObjectMapper();
  }

  private static final String DELEMITER = ",";

  @Override
  public String call(DatalakeRowV1 datalakeRowV1) throws Exception {
    StringBuilder sb = new StringBuilder();

    append(sb, datalakeRowV1.getOrgId(), false);
    append(sb, datalakeRowV1.getDatasetId(), false);
    append(sb, datalakeRowV1.getColumnName(), false);
    append(sb, datalakeRowV1.getMetricPath(), false);
    append(sb, datalakeRowV1.getSegmentText(), false);
    append(sb, datalakeRowV1.getDatasetTags(), false);
    appendTimestamp(
        sb,
        ComputeJobGranularities.truncateTimestamp(
            datalakeRowV1.getDatasetTimestamp(), Granularity.hourly),
        false);
    writeVariance(sb, datalakeRowV1.getVariance());
    append(sb, datalakeRowV1.getDSum(), false);
    append(sb, datalakeRowV1.getDMin(), false);
    append(sb, datalakeRowV1.getDMax(), false);
    append(sb, datalakeRowV1.getUnmergeableD(), false);
    append(sb, datalakeRowV1.getNSum(), false);
    append(sb, datalakeRowV1.getNMin(), false);
    append(sb, datalakeRowV1.getNMax(), false);
    // Upload Audit
    sb.append(DELEMITER);
    append(sb, datalakeRowV1.getDatasetType(), false);
    append(sb, datalakeRowV1.getMergeableSegment(), false);
    append(sb, toString(datalakeRowV1.getKll()), false);
    append(sb, toString(datalakeRowV1.getHll()), false);
    append(sb, toString(datalakeRowV1.getFrequentItems()), false);
    append(sb, toString(datalakeRowV1.getClassificationProfile()), false);
    append(sb, toString(datalakeRowV1.getRegressionProfile()), false);
    appendTimestamp(sb, datalakeRowV1.getLastUploadTs(), false);
    append(sb, datalakeRowV1.getOriginalFilename(), false);
    append(sb, datalakeRowV1.getReferenceProfileId(), false);
    append(sb, datalakeRowV1.getIngestionOrigin(), false);
    appendTimestamp(sb, datalakeRowV1.getDatalakeWriteTs(), true);

    return sb.toString();
  }

  private void appendTimestamp(StringBuilder sb, Long ts, boolean end) {
    if (ts == null) {
      ts = 0l;
    }
    append(sb, Timestamp.from(Instant.ofEpochMilli(ts)).toString(), end);
  }

  private void append(StringBuilder sb, Object o, boolean end) {
    if (o != null) {
      String s = escapeString(o.toString());
      sb.append("\"").append(s).append("\"");
    }

    if (!end) {
      sb.append(DELEMITER);
    }
  }

  public static String escapeString(String s) {
    if (s.contains("\"")) {
      s = s.replace("\"", "\"\"");
    }
    return s;
  }

  /** Can't csv a list, spread it out to multiple columns */
  private void writeVariance(StringBuilder sb, Double[] variance) {
    if (variance != null && variance.length > 0) {
      sb.append(variance[0]).append(DELEMITER);
      sb.append(variance[1]).append(DELEMITER);
      sb.append(variance[2]).append(DELEMITER);
    } else {
      sb.append(DELEMITER).append(DELEMITER).append(DELEMITER);
    }
  }

  String toString(byte[] oBytes) {
    if (oBytes != null && oBytes.length > 0) {
      byte[] bytes = new byte[oBytes.length];
      for (int i = 0; i < oBytes.length; i++) {
        bytes[i] = oBytes[i];
      }

      return DruidStringUtils.encodeBase64String(bytes);
    }

    return null;
  }
}

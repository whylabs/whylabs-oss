package ai.whylabs.adhoc.resolvers;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.utils.SegmentUtils;
import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import ai.whylabs.druid.whylogs.column.WhyLogsRow;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.google.gson.JsonObject;
import java.nio.charset.StandardCharsets;

public class ExplodedRowParser {
  private static final String MODEL_METRIC_COLUMN = "modelMetrics";

  public static ExplodedRow fromEvent(JsonObject event, String orgId, String datasetId, long ts) {
    byte[] modelMetrics = null;
    if (event.has(MODEL_METRIC_COLUMN)) {
      modelMetrics =
          DruidStringUtils.decodeBase64(
              event.get(MODEL_METRIC_COLUMN).getAsString().getBytes(StandardCharsets.UTF_8));
    }

    ExplodedRow.ExplodedRowBuilder b =
        ExplodedRow.builder()
            .missing(false)
            .rowTerminator(false)
            .orgId(orgId)
            .datasetId(datasetId)
            .columnName(event.get("columnName").getAsString())
            .segmentText("")
            .schema_count_BOOLEAN(event.get("schema.count.BOOLEAN").getAsLong())
            .schema_count_FRACTIONAL(event.get("schema.count.FRACTIONAL").getAsLong())
            .schema_count_INTEGRAL(event.get("schema.count.INTEGRAL").getAsLong())
            .schema_count_NULL(event.get("schema.count.NULL").getAsLong())
            .schema_count_UNKNOWN(event.get("schema.count.UNKNOWN").getAsLong())
            .number_max(event.get("number.max").getAsDouble())
            .number_min(event.get("number.min").getAsDouble())
            .counters_count(event.get("counters.count").getAsLong())
            .schema_count_STRING(event.get("schema.count.STRING").getAsLong())
            .ts(ts)
            .histogram(
                DruidStringUtils.decodeBase64(
                    event.get("kll").getAsString().getBytes(StandardCharsets.UTF_8)))
            .uniqueCount(
                DruidStringUtils.decodeBase64(
                    event.get("uniqueCountSketch").getAsString().getBytes(StandardCharsets.UTF_8)))
            .frequentItems(
                DruidStringUtils.decodeBase64(
                    event
                        .get("frequentItems_merged")
                        .getAsString()
                        .getBytes(StandardCharsets.UTF_8)))
            .model_metrics(modelMetrics)
            .missing(false)
            .feedbackRow(false)
            .segmentText(getSegment(event))
            .ingestionMetricRow(false);

    if (event.get("columnName").getAsString().startsWith(DatasetMetrics.INTERNAL_PREFIX)) {
      b.targetLevel(TargetLevel.dataset);
    } else {
      b.targetLevel(TargetLevel.column);
    }
    if (event.has(WhyLogsRow.REFERENCE_PROFILE_ID)) {
      b.profileId(event.get(WhyLogsRow.REFERENCE_PROFILE_ID).getAsString());
    }
    return b.build();
  }

  /**
   * The druid query to resolve tags uses a virtual column. The problem is that our segment texts
   * have an expected ordering to the tags so that the segmentText gets produced in a re-producable
   * way. This method extracts and reorders the tags correctly.
   *
   * <p>{ "type": "expression", "name": "tagSet", "expression": "array_to_string(\"tags\",'&')",
   * "outputType": "STRING" }
   *
   * @param event
   * @return
   */
  private static String getSegment(JsonObject event) {
    if (!event.has("tagSet")) {
      return "";
    }
    String segment = event.get("tagSet").getAsString();
    if (org.apache.commons.lang3.StringUtils.isEmpty(segment)) {
      return "";
    }

    String orderedSegmentText = SegmentUtils.toStringV3(SegmentUtils.parseSegmentV3(segment));
    return orderedSegmentText;
  }
}

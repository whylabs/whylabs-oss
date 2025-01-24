package ai.whylabs.dataservice.metrics;

import ai.whylabs.dataservice.metrics.query.ProfileTimeSeriesQuery;
import com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import org.joda.time.Interval;

@Data
public class DataEvaluationRequest {
  public static final int MAX_COMPARISON_TABLE_COLUMNS = 5;
  public static final int MAX_QUERIES =
      110; // This allows UI to limit 10 metrics X 10 columns + 10 dataset/custom metrics.

  @Schema(required = true, description = "List of columns-metric to query")
  List<ProfileTimeSeriesQuery> queries;

  @Schema(
      description =
          "List of reference profiles, will be used to compose the table columns (the reference profiles flow will ignore interval and columnSegments)")
  List<String> referenceProfiles;

  @Schema(
      description =
          "Segment for rows grouping. Null means overall segment. Can be either a segment or just a key. e.g. \"category\" or \"category=Baby care\"")
  String rowSegmentGroup;

  @Schema(
      description =
          "List of segments, will be used to compose the table columns. Null/Empty means overall segment. Must be a list of segments. e.g. [\"category=Baby care\", \"category=Beverages\"]")
  List<String> columnSegments;

  @Schema(
      type = "string",
      example = "2023-11-01T00:00:00.000Z/P30D",
      description =
          "Optional, return rolled up metrics within this ISO-8601 time period,\n"
              + "inclusive of start and exclusive of end point.\n"
              + "e.g. \"2022-07-01T00:00:00.000Z/P30D\" or "
              + "\"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  Interval interval; //  ISO 8601 formatted interval

  public void validate() {
    checkIntervalTooWide();
    Preconditions.checkArgument(
        referenceProfiles == null || referenceProfiles.size() <= MAX_COMPARISON_TABLE_COLUMNS,
        "Cannot query more than %s reference profiles for comparison",
        MAX_COMPARISON_TABLE_COLUMNS);
    Preconditions.checkArgument(
        columnSegments == null || columnSegments.size() <= MAX_COMPARISON_TABLE_COLUMNS,
        "Cannot query more than %s segments for comparison",
        MAX_COMPARISON_TABLE_COLUMNS);
    Preconditions.checkArgument(
        (referenceProfiles != null && referenceProfiles.size() > 0) || interval != null,
        "Should pass either interval or reference profile ids");
    queries.forEach(ProfileTimeSeriesQuery::validate);
    Preconditions.checkArgument(
        queries.size() <= MAX_QUERIES, "Cannot exceed %s queries", MAX_QUERIES);
  }

  public void checkIntervalTooWide() {
    if (interval == null) return;
    long d = interval.toDuration().getStandardDays();
    Preconditions.checkArgument(
        d <= 180, "Query interval too wide, choose something more narrow than 180 days");
  }
}

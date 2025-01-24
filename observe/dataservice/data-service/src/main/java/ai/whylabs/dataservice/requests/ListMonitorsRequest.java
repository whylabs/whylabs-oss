package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.models.MonitorAndAnomalyCount;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.sql.Timestamp;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;
import lombok.Data;
import lombok.val;
import org.hibernate.query.Query;
import org.joda.time.Interval;

@Data
@Schema(
    description = "List the monitors for a given dataset and time range and segment (exact match)")
public class ListMonitorsRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  protected String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  protected String datasetId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Required")
  @Schema(
      required = true,
      allowableValues = {"column", "dataset"})
  private String targetLevel;

  @JsonPropertyDescription(
      "Segment to match. If null , we will match against all segments. If empty, we will match against the overall segment")
  @Schema(required = false)
  private Segment targetSegment;

  @JsonPropertyDescription("The target column to monitor against if it's a column level monitor")
  private String targetColumn;

  @JsonPropertyDescription("The metric that we ran the monitor against")
  @Schema(required = true)
  private String targetMetric;

  @Schema(description = "The offset to start from. Default is 0", minimum = "0", example = "0")
  private Integer offset;

  @Schema(
      description = "The number of results to return. Default is 100",
      minimum = "1",
      maximum = "500",
      example = "100")
  private Integer pageSize;

  @JsonIgnore
  public void doUpdate(Query<MonitorAndAnomalyCount> query) {
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    query.setParameter("targetLevel", targetLevel);
    query.setParameter("targetMetric", targetMetric);
    query.setParameter("targetColumn", targetColumn);
    val segmentTags =
        Stream.of(targetSegment)
            .filter(Objects::nonNull) //
            .flatMap(it -> it.getTags().stream()) //
            .filter(Objects::nonNull) //
            .map(t -> t.getKey() + "=" + t.getValue()) //
            .toArray(String[]::new);
    query.setParameter("targetSegmentTags", segmentTags);
    query.setParameter("offset", Optional.ofNullable(offset).orElse(0));
    query.setParameter("limit", Optional.ofNullable(pageSize).orElse(100));
    query.setCacheable(true);
  }
}

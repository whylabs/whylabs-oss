package ai.whylabs.dataservice.requests;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.insights.InsightSqlQueryType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.Objects;
import java.util.stream.Stream;
import javax.annotation.Nullable;
import lombok.*;
import org.hibernate.query.Query;
import org.joda.time.Interval;

@EqualsAndHashCode(callSuper = true)
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetSingleProfileInsights extends BaseRequest {
  public static final long ONE_WEEK_IN_MILLIS = Duration.ofDays(7).toMillis();
  public static final long ONE_DAY_IN_MILLIS = Duration.ofDays(1).toMillis();
  public static final long ONE_YEAR_IN_MILLIS = Duration.ofDays(365).toMillis();
  public static final long TEN_WEEKS_IN_MILLIS = Duration.ofDays(70).toMillis();
  public static final long SIX_HOURS_IN_MILLIS = Duration.ofHours(6).toMillis();

  @Schema(required = true)
  String orgId;

  @Schema(required = true)
  String datasetId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(type = "string")
  Interval interval; //  ISO 8601 formatted interval

  @Schema(description = "Optional, reference profile id to run analysis against.")
  @Nullable
  String refProfileId;

  @Nullable Segment segment;

  @JsonPropertyDescription(
      "Granularity of the model. Used to validate that we don't try to run insights across too large a time range.")
  private DataGranularity granularity;

  @JsonIgnore
  public void validate() {
    Preconditions.checkArgument(isNotBlank(orgId), "orgId is required");
    Preconditions.checkArgument(isNotBlank(datasetId), "datasetId is required");
    Preconditions.checkArgument(
        refProfileId == null ^ interval == null, "Must provide either refProfileId or interval");
    if (interval != null) {
      Preconditions.checkArgument(
          granularity != null, "granularity is required if interval is used");

      // Limiting data to 1 duration of the batch for now. TODO: better understand the limits to
      // open up the range
      switch (granularity) {
        case monthly:
          Preconditions.checkArgument(
              interval.toDurationMillis() <= ONE_YEAR_IN_MILLIS,
              "Cannot query more than 1 year of monthly data");
          break;
        case weekly:
          Preconditions.checkArgument(
              interval.toDurationMillis() <= TEN_WEEKS_IN_MILLIS,
              "Cannot query more than 10 weeks");
          break;
        case daily:
          Preconditions.checkArgument(
              interval.toDurationMillis() <= ONE_WEEK_IN_MILLIS,
              "Cannot query more than 1 week of daily data");
          break;
        case hourly:
          Preconditions.checkArgument(
              interval.toDurationMillis() <= ONE_DAY_IN_MILLIS,
              "Cannot query more than 1 day of hourly data");
          break;
        case PT15M:
          Preconditions.checkArgument(
              interval.toDurationMillis() <= SIX_HOURS_IN_MILLIS,
              "Cannot query more than 6 hours of 15-minutely data");
          break;
        default:
          throw new IllegalArgumentException("Unsupported granularity " + granularity);
      }
    }
  }

  @JsonIgnore
  public void doUpdate(Query<?> query) {
    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    if (refProfileId != null) {
      query.setParameter("referenceProfileId", refProfileId);
    } else {
      query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
      query.setParameter("endTS", new Timestamp(interval.getEndMillis()));
    }
    val segmentTags =
        Stream.of(segment)
            .filter(Objects::nonNull) //
            .flatMap(it -> it.getTags().stream()) //
            .filter(Objects::nonNull) //
            .map(t -> t.getKey() + "=" + t.getValue()) //
            .toArray(String[]::new);
    query.setParameter("tags", segmentTags);

    query.setCacheable(true);
  }

  @JsonIgnore
  public InsightSqlQueryType getType() {
    if (refProfileId != null) {
      return InsightSqlQueryType.REFERENCE;
    } else if (segment != null && segment.getTags() != null && !segment.getTags().isEmpty()) {
      return InsightSqlQueryType.SEGMENTED;
    } else {
      return InsightSqlQueryType.OVERALL;
    }
  }
}

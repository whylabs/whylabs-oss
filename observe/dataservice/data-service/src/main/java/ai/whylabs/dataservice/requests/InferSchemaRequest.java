package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.shaded.whylabs.com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NonNull;
import org.joda.time.Duration;
import org.joda.time.Interval;

@Data
@Builder
@EqualsAndHashCode(callSuper = true)
public class InferSchemaRequest extends BaseRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Optional, specify a time range of data to copy over using a ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = false, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @Schema(required = false)
  private List<SegmentTag> segment;

  private static final Duration TWO_WEEKS = Duration.standardDays(14);
  private static final Duration ONE_DAY = Duration.standardDays(1);
  private static final Duration ONE_YEAR = Duration.standardDays(365);
  private static final Duration TWELVE_WEEKS = Duration.standardDays(84);
  private static final Duration SIX_HOURS = Duration.standardHours(6);

  public void validateInterval(@NonNull String granularity) {
    // based on interval validation in GetSingleProfileInsights request,
    // constrain interval to "reasonable" values depending on granularity.
    Duration duration = interval.toDuration();
    switch (granularity) {
      case "P1M":
        Preconditions.checkArgument(
            duration.compareTo(ONE_YEAR) <= 0, "interval for monthly model must be <= 1 year");
        break;
      case "P1W":
        Preconditions.checkArgument(
            duration.compareTo(TWELVE_WEEKS) <= 0,
            "interval for monthly model must be <= 12 weeks");
        break;
      case "P1D":
        Preconditions.checkArgument(
            duration.compareTo(TWO_WEEKS) <= 0, "interval for daily model must be <= 2 weeks");
        break;
      case "PT1H":
        Preconditions.checkArgument(
            duration.compareTo(ONE_DAY) <= 0, "interval for hourly model must be <= 1 day");
        break;
      case "PT15M":
        Preconditions.checkArgument(
            duration.compareTo(ONE_YEAR) <= 0, "interval for 15min model must be <= 6 hours");
        break;
      default:
        throw new IllegalArgumentException("Unrecognized granularity " + granularity);
    }
  }
}

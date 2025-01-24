package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.joda.time.Interval;

// based on parameters to getFeatureProfilesTimeRangeQuery

@Data
@Builder
@EqualsAndHashCode(callSuper = true)
public class ProfileRollupRequest extends BaseRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  protected String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  protected String datasetId;

  @JsonPropertyDescription("List of column names to search for (optional)")
  @Schema(required = true)
  private List<String> columnNames;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to match")
  @Schema(required = false)
  private List<SegmentTag> segment;

  @Schema(required = true)
  private DataGranularity granularity;

  @Schema(required = false, hidden = true)
  @JsonIgnore
  private String segmentKey;

  @JsonPropertyDescription(
      "Optional Fractions for kll quantiles. Defaults to {0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1}")
  @Schema(required = false)
  private List<Double> fractions;

  @JsonPropertyDescription(
      "Optional number of bins for kll histogram.  Mutually exclusive with `splitPoints`. Defaults to 30 if `splitPoints` not set.")
  @Schema(required = false)
  private Integer numBins;

  @JsonPropertyDescription(
      "Optional Split points for kll histogram.  Values must be unique and monotonically increasing. Mutually exclusive with `numBins`. ")
  @Schema(required = false)
  private List<Double> splitPoints;

  @JsonPropertyDescription(
      "Optionally filter to a single trace id. Trace IDs originate from a customer's system such as a filename or database primary key")
  @Schema(required = false)
  protected String traceId;

  @Schema(required = false, hidden = true)
  protected Long profileId;

  @JsonPropertyDescription("Request tokens can be used to 'bookmark' certain query parameters")
  @Schema(required = false)
  private String retrievalToken;
}

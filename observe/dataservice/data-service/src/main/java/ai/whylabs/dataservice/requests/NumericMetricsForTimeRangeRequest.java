package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import org.joda.time.Interval;

@Data
public class NumericMetricsForTimeRangeRequest {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, list of segment tags to match")
  @Schema(required = false)
  private List<SegmentTag> segment;

  @JsonPropertyDescription("Required, granularity of request")
  private DataGranularity granularity;

  @JsonPropertyDescription("Required, list of datasets column names to search for")
  private List<DatasetAndColumn> datasetColumnSelectors;
}

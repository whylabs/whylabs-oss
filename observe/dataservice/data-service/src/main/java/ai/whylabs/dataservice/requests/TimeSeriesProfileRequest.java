package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import org.joda.time.Interval;

@Data
public class TimeSeriesProfileRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetIds")
  @Schema(required = true)
  private List<String> datasetIds;

  @JsonPropertyDescription("Dataset granularity")
  @Schema(required = true)
  private DataGranularity granularity;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional segment filter")
  private List<SegmentTag> segment;
}

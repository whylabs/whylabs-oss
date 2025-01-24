package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;
import org.joda.time.Interval;

@FieldNameConstants
@Data
@ToString
public class BackfillRequest {
  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription(
      "Optional: By default will run all analyzers. This allows scoping the request down to a subset of analyzer ids.")
  @Schema(required = false)
  private List<String> analyzerIds;

  @JsonPropertyDescription(
      "Optional: By default will run on the on_demand queue and update legacy hypertables")
  @Schema(required = false)
  private AsyncAnalysisQueue queue = AsyncAnalysisQueue.on_demand;
}

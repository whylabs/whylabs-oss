package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.ToString;
import org.joda.time.Interval;

@Data
@ToString
public class CopyDataRequest {

  @JsonPropertyDescription(
      "Optional, specify a time range of data to copy over using a ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = false, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Required, sourceOrgId")
  @Schema(required = true)
  private String sourceOrgId;

  @JsonPropertyDescription("Required, targetOrgId")
  @Schema(required = true)
  private String targetOrgId;

  @JsonPropertyDescription("Required, sourceDatasetId")
  @Schema(required = true)
  private String sourceDatasetId;

  @JsonPropertyDescription("Required, targetDatasetId")
  @Schema(required = true)
  private String targetDatasetId;

  @JsonPropertyDescription("Optional, * or a particular ref profile to copy over")
  @Schema(required = false)
  private String profileId;
}

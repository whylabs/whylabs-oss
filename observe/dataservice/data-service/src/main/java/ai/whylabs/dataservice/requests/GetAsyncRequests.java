package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class GetAsyncRequests {
  @JsonPropertyDescription("orgId")
  @Schema(required = false)
  private String orgId;

  @JsonPropertyDescription("datasetId")
  @Schema(required = false)
  private String datasetId;

  @JsonPropertyDescription("runId")
  @Schema(required = false)
  private String runId;

  @JsonPropertyDescription("list only active jobs")
  @Schema(required = false)
  private Boolean onlyActive;

  @JsonPropertyDescription("filter by queue")
  @Schema(required = false)
  private AsyncAnalysisQueue queue;

  @JsonPropertyDescription(
      "Read from replica servers, but potentially get replication delayed info back")
  @Schema(required = false)
  private Boolean enableEventuallyConsistency = true;

  @JsonPropertyDescription("Limit as per sql definition, max " + ValidateRequest.MAX_PAGE_SIZE)
  @Schema(
      type = "integer",
      minimum = "1",
      maximum = "" + ValidateRequest.MAX_PAGE_SIZE,
      defaultValue = "50")
  private Integer limit = 50;

  @JsonPropertyDescription("Offset as per sql definition, max " + ValidateRequest.MAX_OFFSET)
  @Schema(
      type = "integer",
      minimum = "0",
      maximum = "" + ValidateRequest.MAX_OFFSET,
      defaultValue = "0")
  private Integer offset = 0;
}

package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class GetTracesResponse {

  @Builder
  @Data
  public static class TraceRow {
    private Long datasetTimestamp;
    private String traceId;
    private String file;
  }

  private List<TraceRow> traces;
  private boolean isTruncated;
  private int nextOffset;

  @JsonProperty("isTruncated")
  public boolean getIsTruncated() {
    return this.isTruncated;
  }
}

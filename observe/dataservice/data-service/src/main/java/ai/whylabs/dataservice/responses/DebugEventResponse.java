package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.structures.DebugEvent;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DebugEventResponse {
  private List<DebugEvent> events;
  private boolean isTruncated;
  private int nextOffset;

  @JsonProperty("isTruncated")
  public boolean getIsTruncated() {
    return this.isTruncated;
  }
}

package ai.whylabs.core.configV3.structure;

import javax.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomerEvent {
  private String userId;
  private String eventType;
  private Long eventTimestamp;
  @Nullable private String description;
}

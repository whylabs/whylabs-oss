package ai.whylabs.druid.whylogs.operationalMetrics;

import com.whylogs.v0.core.message.InferredType.Type;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Metadata {
  private Type type;
  boolean discrete;
  private Direction direction;
}

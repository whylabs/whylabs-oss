package ai.whylabs.dataservice.operationalMetrics;

import com.whylogs.v0.core.message.InferredType.Type;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ColumnMetadata {
  private Type type;
  boolean discrete;
  private Direction direction;
  private List<String> tags;
}

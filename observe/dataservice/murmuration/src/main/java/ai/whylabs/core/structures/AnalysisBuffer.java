package ai.whylabs.core.structures;

import ai.whylabs.core.collectors.ExplodedRowCollectorV3;
import java.util.ArrayList;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisBuffer {

  private List<ExplodedRowCollectorV3> collectors = new ArrayList<>();
  private boolean initialized = false;
}

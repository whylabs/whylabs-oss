package ai.whylabs.core.configV3.structure;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class WeightConfig {
  private Metadata metadata;
  private Weights defaultWeights;
  private List<SegmentWeightConfig> segmentWeights;
}

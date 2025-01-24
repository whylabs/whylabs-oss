package ai.whylabs.core.configV3.structure;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SegmentWeightConfig {

  private Map<String, Double> weights;
  private List<Tag> segment;
}

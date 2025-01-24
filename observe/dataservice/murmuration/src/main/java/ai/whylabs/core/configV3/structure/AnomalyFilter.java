package ai.whylabs.core.configV3.structure;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AnomalyFilter {
  private List<String> excludeColumns;
  private List<String> includeColumns;
  private List<String> includeMetrics;
  private Double minWeight;
  private Double maxWeight;
  private Integer maxAlertCount;
  private Double maxTotalWeight;
  private Integer minAlertCount;
  private Double minTotalWeight;

  // TODO: Implement
  private Integer maxRankByWeight;
  // TODO: Implement
  private Integer minRankByWeight;
}

package ai.whylabs.core.calculationsV3.results;

import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class SchemaChangeResult implements CalculationResult {
  private Long added;
  private Long removed;
  private List<String> addedSample;
  private List<String> removedSample;
  private ColumnListChangeMode mode;
  private Long alertCount;

  @Override
  public void populate(AnalyzerResult.AnalyzerResultBuilder builder) {
    builder
        .columnList_added(added)
        .columnList_removed(removed)
        .columnList_addedSample(addedSample)
        .columnList_removedSample(removedSample)
        .columnList_mode(mode)
        .anomalyCount(alertCount);
  }
}

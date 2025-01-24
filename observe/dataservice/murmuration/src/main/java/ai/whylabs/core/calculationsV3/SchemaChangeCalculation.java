package ai.whylabs.core.calculationsV3;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.SchemaChangeResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class SchemaChangeCalculation extends BaseCalculationV3<List<String>, SchemaChangeResult> {
  private final ColumnListChangeConfig config;
  private static final int SAMPLE_SIZE = 10;

  public SchemaChangeCalculation(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull ColumnListChangeConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public SchemaChangeResult calculate(
      List<Pair<Long, List<String>>> baseline,
      List<Pair<Long, List<String>>> target,
      List<Pair<Long, CalculationResult>> _ignored2) {

    Set<String> baseFields = new HashSet<>();
    Set<String> targetFields = new HashSet<>();

    val baseList = baseline.get(baseline.size() - 1).getValue();
    val targetList = target.get(target.size() - 1).getValue();

    if (baseList != null) {
      baseFields.addAll(baseList);
      if (config.getExclude() != null) {
        config.getExclude().forEach(baseFields::remove);
      }
    }
    if (targetList != null) {
      targetFields.addAll(targetList);
      if (config.getExclude() != null) {
        config.getExclude().forEach(targetFields::remove);
      }
    }

    Set<String> addedFields = new HashSet<>(targetFields);
    addedFields.removeAll(baseFields);

    Set<String> removedFields = new HashSet<>(baseFields);
    removedFields.removeAll(targetFields);

    List<String> addedSample = addedFields.stream().limit(SAMPLE_SIZE).collect(Collectors.toList());
    List<String> removedSample =
        removedFields.stream().limit(SAMPLE_SIZE).collect(Collectors.toList());
    val builder = SchemaChangeResult.builder();

    switch (config.getMode()) {
      case ON_ADD:
        builder.alertCount(addedFields.size() > 0 ? 1L : 0L);
        break;
      case ON_ADD_AND_REMOVE:
        long sum = addedFields.size() + removedFields.size();
        builder.alertCount(sum > 0 ? 1L : 0L);
        break;
      case ON_REMOVE:
        builder.alertCount(removedFields.size() > 0 ? 1L : 0L);
        break;
    }

    // Null is better than an empty list
    if (addedSample != null && addedSample.size() == 0) {
      addedSample = null;
    }
    if (removedSample != null && removedSample.size() == 0) {
      removedSample = null;
    }

    builder
        .mode(config.getMode())
        .added(new Long(addedFields.size()))
        .removed(new Long(removedFields.size()))
        .addedSample(addedSample)
        .removedSample(removedSample);

    return builder.build();
  }

  @Override
  public boolean requireRollup() {
    return false;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return SchemaChangeResult.builder()
            .mode(analyzerResult.getColumnList_mode())
            .addedSample(analyzerResult.getColumnList_addedSample())
            .removedSample(analyzerResult.getColumnList_removedSample())
            .added(analyzerResult.getColumnList_added())
            .removed(analyzerResult.getColumnList_removed())
            .alertCount(analyzerResult.getAnomalyCount())
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    return false;
  }
}

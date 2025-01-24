package ai.whylabs.core.calculationsV3;

import static io.micronaut.core.util.CollectionUtils.isNotEmpty;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.FrequentStringComparisonResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonConfig;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.google.common.collect.Sets;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ErrorType;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.*;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;

/**
 * Compare target vs baseline frequent item sketches. Note this analyzer works best for low
 * cardinality datasets as the contents of sketches become probabilistic once there's >256 unique
 * items. High cardinality columns will produce false positives and false negatives.
 */
@Slf4j
public class FrequentStringComparison
    extends BaseCalculationV3<ItemsSketch<String>, FrequentStringComparisonResult> {
  /**
   * Whylogs crops strings as they're being logged, but java started that before python did, so
   * we've got a mix of both cropped and un-cropped items in our historical profiles.
   */
  public static final int CROP_CHARS = 128;

  public static final int SAMPLE_SIZE = 5;

  private FrequentStringComparisonConfig config;

  public FrequentStringComparison(
      MonitorConfigV3 monitorConfigV3,
      Analyzer analyzer,
      boolean overwriteEvents,
      @NonNull FrequentStringComparisonConfig config) {
    super(monitorConfigV3, analyzer, overwriteEvents);
    this.config = config;
  }

  @Override
  public CalculationResult calculate(
      List<Pair<Long, ItemsSketch<String>>> baseline,
      List<Pair<Long, ItemsSketch<String>>> target,
      List<Pair<Long, CalculationResult>> priorResults) {
    if (target.size() != 1 || target.get(0).getValue() == null) {
      return null;
    }

    val targetFreq = target.get(0).getValue();
    val baselineFreq = baseline.get(0).getValue();

    Set<FrequentString> baselineSet = new HashSet<>();
    Set<FrequentString> targetSet = new HashSet<>();

    for (val r : targetFreq.getFrequentItems(ErrorType.NO_FALSE_NEGATIVES)) {
      targetSet.add(new FrequentString(r));
    }
    for (val r : baselineFreq.getFrequentItems(ErrorType.NO_FALSE_NEGATIVES)) {
      baselineSet.add(new FrequentString(r));
    }

    long alerting = 0l;
    List<FrequentString> sample = null;
    switch (config.getOperator()) {
      case eq:
        alerting = targetSet.equals(baselineSet) ? 0 : 1;
        sample =
            Sets.symmetricDifference(targetSet, baselineSet).stream().collect(Collectors.toList());
        break;
      case baseline_includes_all_target:
        alerting = baselineSet.containsAll(targetSet) ? 0 : 1;
        if (alerting > 0) {
          targetSet.removeAll(baselineSet);
          sample = targetSet.stream().collect(Collectors.toList());
        }
        break;
      case target_includes_all_baseline:
        alerting = targetSet.containsAll(baselineSet) ? 0 : 1;
        if (alerting > 0) {
          baselineSet.removeAll(targetSet);
          sample = baselineSet.stream().collect(Collectors.toList());
        }
        break;
      default:
        throw new IllegalArgumentException("Operator not yet supported " + config.getOperator());
    }
    List<Long[]> counts = null;
    List<String> strings = null;
    if (isNotEmpty(sample)) {
      // build estimated counts in same order as sample.
      sample = sample.subList(0, Math.min(sample.size(), SAMPLE_SIZE));
      counts =
          sample.stream()
              .map(s -> new Long[] {s.getEstimate(), s.getLowerBound(), s.getUpperBound()})
              .collect(Collectors.toList());
      strings = sample.stream().map(s -> s.getItem()).collect(Collectors.toList());
    }

    // NOTE: calculation result only deals in string values
    return FrequentStringComparisonResult.builder()
        .alertCount(alerting)
        .operator(config.getOperator())
        .sample(strings)
        .sampleCounts(counts)
        .build();
  }

  @Override
  public boolean requireRollup() {
    return true;
  }

  @Override
  public Function<AnalyzerResult, CalculationResult> getPreviousResultTransformer() {
    return new Function<AnalyzerResult, CalculationResult>() {
      @Override
      public CalculationResult apply(AnalyzerResult analyzerResult) {
        return FrequentStringComparisonResult.builder()
            .alertCount(analyzerResult.getAnomalyCount())
            .operator(config.getOperator())
            .sample(analyzerResult.getFrequentStringComparison_sample())
            .sampleCounts(analyzerResult.getFreqStringCount())
            .build();
      }
    };
  }

  @Override
  public boolean renderAnomalyChart(
      ChartMetadata metadata, List<Pair<Long, CalculationResult>> results, String path) {
    return false;
  }

  /**
   * Sole purpose of this class is to delegate ItemsSketch.Row to allow the items be comparable by
   * string, rather than by Estimate count.
   */
  @AllArgsConstructor
  public static class FrequentString implements Comparable<FrequentString> {

    private interface exclude {
      int compareTo(final FrequentString that);

      String getItem();

      boolean equals(Object obj);
    }

    @Delegate
    private com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch.Row<String> delegate;

    /**
     * This compareTo is strictly limited to the item.getItem() value and does not imply any
     * ordering whatsoever to the other elements of the row: estimate and upper and lower bounds.
     */
    @Override
    public int compareTo(final FrequentString that) {
      return this.getItem().compareTo(that.getItem());
    }

    /**
     * This equals is computed only from the Row.getItem() value and does not imply equality of the
     * other items within the row: estimate and upper and lower bounds.
     */
    @SuppressWarnings("unchecked")
    @Override
    public boolean equals(final Object obj) {
      if (this == obj) {
        return true;
      }
      if (obj == null) {
        return false;
      }
      if (!(obj instanceof FrequentString)) {
        return false;
      }
      final FrequentString that = (FrequentString) obj;
      return getItem().equals(that.getItem());
    }

    @Override
    public int hashCode() {
      return getItem().hashCode();
    }

    /*
    Make sure to crop baseline and target separately to account for different whylogs versions where
    strings weren't always cropped.
    */
    public String getItem() {
      val item = delegate.getItem();
      return item.substring(0, Math.min(item.length(), CROP_CHARS));
    }
  }
}

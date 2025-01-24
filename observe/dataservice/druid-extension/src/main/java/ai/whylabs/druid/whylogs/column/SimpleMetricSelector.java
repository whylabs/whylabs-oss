package ai.whylabs.druid.whylogs.column;

import com.google.common.collect.ImmutableSortedMap;
import com.whylogs.core.ColumnProfile;
import com.whylogs.v0.core.message.InferredType;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Extract metrics from WhyLogs profile to simple metrics.
 *
 * <p>Simple metric means that we can aggregate them using existing Druid aggregator
 */
public class SimpleMetricSelector {

  public static final Map<String, SimpleMetricSelector> SELECTORS;

  public static final String LONG_SUM_AGG = "longSum";

  public static final String DOUBLE_SUM_AGG = "doubleSum";

  public static final String DOUBLE_MIN_AGG = "doubleMin";

  public static final String COUNTER_AGG = "count";

  public static final String DOUBLE_MAX_AGG = "doubleMax";

  public static final String COUNTERS_COUNT = "counters.count";

  public static final String COUNTERS_TRUE_COUNT = "counters.trueCount";

  @Deprecated // use SCHEMA_COUNT_NULL instead
  public static final String COUNTERS_NULL_COUNT = "counters.nullCount";

  public static final String SCHEMA_COUNT_BOOLEAN = "schema.count.BOOLEAN";

  public static final String SCHEMA_COUNT_FRACTIONAL = "schema.count.FRACTIONAL";

  public static final String SCHEMA_COUNT_INTEGRAL = "schema.count.INTEGRAL";

  public static final String SCHEMA_COUNT_STRING = "schema.count.STRING";

  public static final String SCHEMA_COUNT_NULL = "schema.count.NULL";

  public static final String SCHEMA_COUNT_UNKNOWN = "schema.count.UNKNOWN";

  public static final String NUMBER_COUNT = "number.count";

  public static final String NUMBER_MIN = "number.min";

  public static final String NUMBER_MAX = "number.max";

  public static final String NUMBER_DOUBLE_SUM = "number.double.sum";

  public static final String NUMBER_DOUBLE_COUNT = "number.double.count";

  public static final String NUMBER_LONG_SUM = "number.long.sum";

  public static final String NUMBER_LONG_COUNT = "number.long.count";

  static {
    final Map<String, SimpleMetricSelector> mutableMap =
        Stream.of(
                // COUNTERS
                new SimpleMetricSelector(
                    COUNTERS_COUNT, p -> p.getCounters().getCount(), LONG_SUM_AGG),
                new SimpleMetricSelector(
                    COUNTERS_TRUE_COUNT, p -> p.getCounters().getTrueCount(), LONG_SUM_AGG),
                new SimpleMetricSelector(
                    COUNTERS_NULL_COUNT, SimpleMetricSelector::getNullCount, LONG_SUM_AGG),
                // SCHEMA
                new SimpleMetricSelector(
                    SCHEMA_COUNT_BOOLEAN,
                    p -> getTypeCount(p, InferredType.Type.BOOLEAN),
                    LONG_SUM_AGG),
                new SimpleMetricSelector(
                    SCHEMA_COUNT_FRACTIONAL,
                    p -> getTypeCount(p, InferredType.Type.FRACTIONAL),
                    LONG_SUM_AGG),
                new SimpleMetricSelector(
                    SCHEMA_COUNT_INTEGRAL,
                    p -> getTypeCount(p, InferredType.Type.INTEGRAL),
                    LONG_SUM_AGG),
                new SimpleMetricSelector(
                    SCHEMA_COUNT_STRING,
                    p -> getTypeCount(p, InferredType.Type.STRING),
                    LONG_SUM_AGG),
                new SimpleMetricSelector(
                    SCHEMA_COUNT_NULL, SimpleMetricSelector::getNullCount, LONG_SUM_AGG),
                new SimpleMetricSelector(
                    SCHEMA_COUNT_UNKNOWN,
                    p -> getTypeCount(p, InferredType.Type.UNKNOWN),
                    LONG_SUM_AGG),
                // NUMBER TRACKER
                new SimpleMetricSelector(
                    NUMBER_COUNT, p -> p.getNumberTracker().getHistogram().getN(), LONG_SUM_AGG),
                new SimpleMetricSelector(
                    NUMBER_MIN,
                    p -> p.getNumberTracker().getHistogram().getMinValue(),
                    DOUBLE_MIN_AGG),
                new SimpleMetricSelector(
                    NUMBER_MAX,
                    p -> p.getNumberTracker().getHistogram().getMaxValue(),
                    DOUBLE_MAX_AGG),
                new SimpleMetricSelector(
                    NUMBER_DOUBLE_SUM,
                    p -> p.getNumberTracker().getDoubles().getSum(),
                    DOUBLE_SUM_AGG),
                new SimpleMetricSelector(
                    NUMBER_DOUBLE_COUNT,
                    p -> p.getNumberTracker().getDoubles().getCount(),
                    COUNTER_AGG),
                new SimpleMetricSelector(
                    NUMBER_LONG_SUM, p -> p.getNumberTracker().getLongs().getSum(), LONG_SUM_AGG),
                new SimpleMetricSelector(
                    NUMBER_LONG_COUNT,
                    p -> p.getNumberTracker().getLongs().getCount(),
                    COUNTER_AGG))
            .collect(Collectors.toMap(s -> s.columnName, Function.identity()));

    SELECTORS = ImmutableSortedMap.copyOf(mutableMap);
  }

  private final String columnName;
  private final Function<ColumnProfile, ? extends Number> extractor;
  private final String aggregator;

  public SimpleMetricSelector(
      String columnName, Function<ColumnProfile, ? extends Number> extractor, String aggregator) {
    this.columnName = columnName;
    this.extractor = extractor;
    this.aggregator = aggregator;
  }

  private static Long getTypeCount(ColumnProfile profile, InferredType.Type unknown) {
    return profile.getSchemaTracker().getTypeCounts().getOrDefault(unknown, 0L);
  }

  /**
   * Return null count. This value should match from both schema count and the main null count.
   * However, they don't due to whylogs#32 so this is the workaround
   *
   * @param profile the profile
   * @return the schema null count
   */
  static long getNullCount(ColumnProfile profile) {
    return profile.getSchemaTracker().getTypeCounts().getOrDefault(InferredType.Type.NULL, 0L);
  }

  public String getAggregator() {
    return aggregator;
  }

  public String getColumnName() {
    return columnName;
  }

  public Number apply(ColumnProfile profile) {
    return extractor.apply(profile);
  }
}

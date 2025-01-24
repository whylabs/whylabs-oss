package ai.whylabs.dataservice.metrics.spec;

import static ai.whylabs.dataservice.metrics.spec.Constants.BUILT_IN_METRIC_PATTERN;

import ai.whylabs.dataservice.metrics.agg.BuiltinSpec;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.google.common.collect.ImmutableList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

@Getter
public enum BuiltinTraceMetric implements BuiltinMetric {
  count_traces(BuiltinSpec.traces_count),
  total_policy_issues(BuiltinSpec.tags_count),
  total_blocked(BuiltinSpec.actions_count),
  total_tokens(BuiltinSpec.tokens_count),
  total_latency_millis(BuiltinSpec.latency_millis);

  private final List<NumericMetric> metrics;
  private final String formula;

  BuiltinTraceMetric(BuiltinSpec spec) {
    this.metrics = ImmutableList.of(NumericMetric.builder().spec(spec).build());
    this.formula = null;
  }

  BuiltinTraceMetric(String formula) {
    val matcher = BUILT_IN_METRIC_PATTERN.matcher(formula);
    val metricsBuilder = ImmutableList.<NumericMetric>builder();
    while (matcher.find()) {
      String group = matcher.group();
      try {
        val spec = BuiltinSpec.valueOf(group);
        metricsBuilder.add(NumericMetric.builder().hidden(true).spec(spec).build());
      } catch (IllegalArgumentException e) {
        // skip if not a BuiltinSpec
      }
    }
    this.metrics = metricsBuilder.build();
    this.formula = formula;
  }

  /** static map of aliases created through @JsonAlias. */
  private static final Map<String, BuiltinTraceMetric> aliasMap = new HashMap<>();

  /** build a map of aliases created through @JsonAlias. */
  static {
    for (BuiltinTraceMetric myEnum : values()) {
      JsonAlias aliasAnnotation = myEnum.getAnnotation(JsonAlias.class);
      if (aliasAnnotation != null) {
        for (String alias : aliasAnnotation.value()) {
          aliasMap.put(alias, myEnum);
        }
      }
    }
  }

  /** helper for assembling static list of aliases */
  private JsonAlias getAnnotation(Class<JsonAlias> annotationClass) {
    try {
      return this.getClass().getField(this.name()).getAnnotation(annotationClass);
    } catch (NoSuchFieldException e) {
      return null;
    }
  }

  /** custom deserialization to catch invalid metric names, and provide a useful error message. */
  @JsonCreator
  public static BuiltinTraceMetric forValue(String value) {
    // check for aliases first.
    BuiltinTraceMetric metric = aliasMap.get(value);
    if (metric != null) {
      return metric;
    }

    // try to convert to enum, list all valid values in failure message.
    try {
      metric = BuiltinTraceMetric.valueOf(StringUtils.lowerCase(value));
    } catch (IllegalArgumentException e) {
      String msg = String.format("Unrecognized builtin trace metric \"%s\".\n", value);
      msg += "Valid metric names are: ";
      msg +=
          Arrays.stream(BuiltinTraceMetric.values())
              .map(BuiltinTraceMetric::name)
              .collect(Collectors.joining(", "));
      // implementation note: micronaut converts RuntimeException to ConversionErrorException before
      // surfacing.
      throw new RuntimeException(msg);
    }
    return metric;
  }
}

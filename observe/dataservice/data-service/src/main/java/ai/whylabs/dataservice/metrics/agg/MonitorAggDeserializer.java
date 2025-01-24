package ai.whylabs.dataservice.metrics.agg;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import java.io.IOException;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.reflect.Constructor;
import lombok.val;

/**
 * Custom deserializer for BuiltinMonitorAgg enums.
 *
 * <p>Will parse static enum value, e.g. "sum_threshold" or an object representation of the enum,
 * e.g. {"op":"sum", "column":"col"}
 *
 * <p>When deserializing an object representation, use reflection to dynamically construct a unique
 * enum value.
 */
public class MonitorAggDeserializer extends StdDeserializer<MonitorAgg> {

  // use enums to filter operator strings supplied by user to avoid SQL injection attacks
  enum SqlOperator {
    sum,
    max,
    min,
    avg,
  }

  // use enums to filter filed names supplied by user to avoid SQL injection attacks
  public enum AnalyzerField {
    anomaly_count,
    diff_metric_value,
    diff_threshold,
    drift_metric_value,
    drift_threshold,
    threshold_absolute_lower,
    threshold_absolute_upper,
    threshold_calculated_lower,
    threshold_calculated_upper,
    threshold_factor,
    threshold_baseline_metric_value,
    threshold_metric_value,
  }

  public MonitorAggDeserializer() {
    this(null);
  }

  public MonitorAggDeserializer(Class<?> vc) {
    super(vc);
  }

  @Override
  public MonitorAgg deserialize(JsonParser jp, DeserializationContext ctxt)
      throws java.io.IOException, com.fasterxml.jackson.core.JacksonException {
    JsonNode node = jp.getCodec().readTree(jp);
    if (node.isObject()) {
      // expect an object definition like
      //    {"op":"sum", "column":"col"},
      if (node.hasNonNull("op") && node.hasNonNull("column")) {
        // decode as enum values to protect against sql injection
        val op = SqlOperator.valueOf(node.get("op").asText()).name();
        val col = AnalyzerField.valueOf(node.get("column").asText()).name();
        try {
          Constructor<MonitorAgg> c =
              MonitorAgg.class.getDeclaredConstructor(
                  String.class, int.class, String.class, String.class);
          c.setAccessible(true);
          MethodHandle h = MethodHandles.lookup().unreflectConstructor(c);
          // The name and ordinal of this synthetic enum does not matter.
          // It is not added to the set of static enums, and it will never be searched by name.
          // Synthetic enums will not conflict with static enums, nor with each other.
          // Like all Java objects, synthetic enums will be GC'd when no longer referenced.
          return (MonitorAgg) h.invokeExact("_monitor_agg_", 0, op, col);
        } catch (Throwable e) {
          throw new RuntimeException(e);
        }
      }
    } else {
      // or an enum like  "sum_threshold"
      return MonitorAgg.valueOf(node.asText());
    }
    throw new IOException(
        String.format("Cannot parse monitor aggregation \"%s\"", node.toString()));
  }
}

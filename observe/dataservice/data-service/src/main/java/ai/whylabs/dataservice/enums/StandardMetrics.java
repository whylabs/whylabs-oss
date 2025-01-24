package ai.whylabs.dataservice.enums;

import com.google.common.collect.ImmutableSet;
import com.shaded.whylabs.com.google.protobuf.ByteString;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.core.message.HllSketchMessage;
import com.whylogs.core.message.MetricComponentMessage;
import java.util.Optional;
import java.util.Set;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public enum StandardMetrics {
  COUNT_N("counts/n"),
  COUNT_NULL("counts/null"),
  COUNT_TYPES_OBJECTS("types/object"),
  COUNT_TYPES_FRACTIONAL("types/fractional"),
  COUNT_TYPES_INTEGRAL("types/integral"),
  COUNT_TYPES_BOOLEAN("types/boolean"),
  COUNT_TYPES_STRING("types/string"),
  HLL("cardinality/hll"),
  ;

  private static Set<StandardMetrics> LONG_TYPES =
      ImmutableSet.of( //
          COUNT_N, //
          COUNT_NULL,
          COUNT_TYPES_OBJECTS,
          COUNT_TYPES_FRACTIONAL,
          COUNT_TYPES_INTEGRAL,
          COUNT_TYPES_BOOLEAN,
          COUNT_TYPES_STRING);

  @Getter private final String path;

  StandardMetrics(String path) {
    this.path = path;
  }

  public Optional<MetricComponentMessage> getMetricComponent(ColumnMessage msg) {
    return Optional.ofNullable(msg)
        .map(ColumnMessage::getMetricComponentsMap)
        .map(it -> it.get(path));
  }

  public Optional<HllSketch> getOptionalHll(ColumnMessage msg) {
    if (this != HLL) {
      throw new IllegalArgumentException("Not an HLL metric");
    }
    try {
      return getMetricComponent(msg)
          .map(MetricComponentMessage::getHll) //
          .map(HllSketchMessage::getSketch)
          .map(ByteString::toByteArray)
          .map(Memory::wrap)
          .map(HllSketch::wrap);
    } catch (Exception e) {
      log.error("Failed to deserialize HLL sketch", e);
      return Optional.empty();
    }
  }

  public Optional<Long> getOptionalLong(ColumnMessage msg) {
    if (!LONG_TYPES.contains(this)) {
      throw new IllegalArgumentException("Not a long metric");
    }
    return getMetricComponent(msg).map(MetricComponentMessage::getN);
  }

  public long getLong(ColumnMessage msg) {
    return getOptionalLong(msg).orElse(0L);
  }

  public Optional<Double> getOptionalDouble(ColumnMessage msg) {
    return getMetricComponent(msg).map(MetricComponentMessage::getD);
  }

  public double getDouble(ColumnMessage msg) {
    return getOptionalDouble(msg).orElse(0.0d);
  }
}

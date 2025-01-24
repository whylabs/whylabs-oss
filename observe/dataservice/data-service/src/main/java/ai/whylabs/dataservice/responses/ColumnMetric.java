package ai.whylabs.dataservice.responses;

import static ai.whylabs.dataservice.enums.StandardMetrics.*;
import static java.util.Objects.nonNull;

import ai.whylabs.dataservice.services.ProfileService;
import ai.whylabs.druid.whylogs.util.DruidStringUtils;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.shaded.whylabs.com.google.protobuf.ByteString;
import com.whylogs.core.message.HllSketchMessage;
import com.whylogs.core.message.MetricComponentMessage;
import com.whylogs.v0.core.message.HistogramSummary;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * POJO to hold v1-like metric values retrieved from postgres, or synthesized in post-aggregators.
 *
 * <p>Note this class does not hold metrics directly from profiles; those are packaged in the V1
 * protobuf message MetricComponentMessage.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
@JsonSerialize(using = ColumnMetricSerializer.class)
public class ColumnMetric {

  // exactly like ColumnMetricEntity, but with additional fields
  @Delegate private ColumnMetricEntity entity;

  // Fields for additional derived metrics
  private Map<String, Object> frequent_strings;
  // actual type is HistogramSummary but it makes OpenAPI generation pulls in Protobuf
  private Object histogram;
  private double[] quantiles;
  private Boolean booleans;
  private Object objects;

  public ColumnMetric(ColumnMetricEntity cmp) {
    entity = cmp;
  }

  public ColumnMetric(String path, Double d) {
    entity = ColumnMetricEntity.builder().metricPath(path).doubles(d).build();
  }

  public ColumnMetric(String path, Object o) {
    val clazz = o.getClass();

    entity = ColumnMetricEntity.builder().metricPath(path).build();
    objects = o;
  }

  public ColumnMetric(String path, Long l) {
    entity = ColumnMetricEntity.builder().metricPath(path).longs(l).build();
  }

  public ColumnMetric(String path, String s) {
    entity = ColumnMetricEntity.builder().metricPath(path).strings(s).build();
  }

  public ColumnMetric(String path, Map<String, Object> f) {
    entity = ColumnMetricEntity.builder().metricPath(path).build();
    frequent_strings = f;
  }

  public ColumnMetric(String path, HistogramSummary h) {
    entity = ColumnMetricEntity.builder().metricPath(path).build();
    histogram = h;
  }

  public ColumnMetric(String path, double[] q) {
    entity = ColumnMetricEntity.builder().metricPath(path).build();
    quantiles = q;
  }

  public ColumnMetric(String path, Boolean b) {
    entity = ColumnMetricEntity.builder().metricPath(path).build();
    booleans = b;
  }

  enum Type {
    type_long,
    type_double,
    type_string,
    type_boolean,
    type_quantile,
    type_frequentstrings,
    type_histogram,
    type_unknown
  }

  // return type of value contained in this metric.
  ColumnMetric.Type typeOf() {
    ColumnMetric.Type type;
    if (getLongs() != null) {
      type = ColumnMetric.Type.type_long;
    } else if (getDoubles() != null) {
      type = ColumnMetric.Type.type_double;
    } else if (getStrings() != null
        || entity.getMetricPath().equals(ProfileService.TRACE_ID_PATH)) {
      type = ColumnMetric.Type.type_string;
    } else if (getBooleans() != null) {
      type = Type.type_boolean;
    } else if (getQuantiles() != null) {
      type = ColumnMetric.Type.type_quantile;
    } else if (getFrequent_strings() != null) {
      type = ColumnMetric.Type.type_frequentstrings;
    } else if (getHistogram() != null) {
      type = ColumnMetric.Type.type_histogram;
    } else {
      type = ColumnMetric.Type.type_unknown;
    }
    return type;
  }

  /** Convert Postgres row to equivalent protobuf msg from whylogs profile. */
  public MetricComponentMessage toProtobuf() {
    val builder = MetricComponentMessage.newBuilder();

    if (nonNull(getLongs())) {
      builder.setN(getLongs());
    } else if (nonNull(getStrings())) {
      switch (getMetricPath()) {
        case "cardinality/hll":
          val bytes =
              ByteString.copyFrom(
                  DruidStringUtils.decodeBase64(getStrings().getBytes(StandardCharsets.UTF_8)));
          val sketch = HllSketchMessage.newBuilder().setSketch(bytes).build();
          builder.setHll(sketch);
      }
    }
    return builder.build();
  }
}

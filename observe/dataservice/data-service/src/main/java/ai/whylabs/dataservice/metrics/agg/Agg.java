package ai.whylabs.dataservice.metrics.agg;

import static java.util.Objects.isNull;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

public interface Agg {
  String getOperation();

  // default supplied to make profile-centric code happy.  There are no metric_paths in analyser
  // results.
  default String getMetricPath() {
    return null;
  }

  String getColumn();

  /** return class for parsing postgres query results */
  default Class<? extends Agg.Row> getResultsRow() {
    return Agg.NumericRow.class;
  }

  @JsonIgnore
  default String getSql() {
    return getOperation() + "(" + getColumn() + ")";
  }

  /** base class for aggregated profile results */
  @Data
  @Entity
  static class Row {
    @Id Long timestamp;

    @Schema(description = "Optional. Only available for profile sourced metrics")
    @Column(name = "last_modified")
    Long lastModified;

    @Schema(description = "Optional. Only available for profile sourced metrics")
    @Column(name = "trace_id")
    String traceId;

    public boolean isEmpty() {
      return false;
    }
  }

  /** class for Entity for querying postgres numeric results */
  @Data
  @Entity
  static class NumericRow extends Row {
    Double value;

    public boolean isEmpty() {
      return isNull(value);
    }
  }

  /**
   * Entity for querying postgres base64-encoded results, like classification or regression metrics,
   * or KLL or HLL sketches. The byte string value from postgres is read directly into `value`.
   */
  @Data
  @Entity
  static class BytesRow extends Row {
    byte[] value;

    @Override
    public boolean isEmpty() {
      return isNull(value);
    }
  }

  /** Entity for querying postgres variance encoded as three double values. */
  @Data
  @Entity
  static class VarianceRow extends Row {
    BigDecimal[] value;

    @Override
    public boolean isEmpty() {
      return isNull(value);
    }
  }
}

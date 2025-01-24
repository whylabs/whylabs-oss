package ai.whylabs.dataservice.metrics.result;

import ai.whylabs.dataservice.metrics.MetricConstants;
import ai.whylabs.dataservice.metrics.agg.Agg;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonTypeName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.*;

@JsonTypeName(MetricConstants.TIMESERIES)
@Data
@EqualsAndHashCode(callSuper = true)
public class TimeSeriesResult extends SingleQueryResult {
  @Singular("addEntry")
  List<MetricEntry> data;

  @Schema(description = "Start time (inclusive) of the interval in milliseconds since epoch")
  long startTime;

  @Schema(description = "End time (inclusive) of the interval in milliseconds since epoch")
  long endTime;

  @Schema(description = "Interval between data points in milliseconds")
  long interval;

  @JsonIgnore Boolean hidden = false;

  @Data
  @Entity
  @NoArgsConstructor
  public static class MetricEntry {
    @Id Long timestamp;

    @Schema(description = "Optional. Only available for profile sourced metrics")
    @Column(name = "last_modified")
    Long lastModified;

    Double value;

    public MetricEntry(Agg.NumericRow r) {
      this.timestamp = r.getTimestamp();
      this.lastModified = r.getLastModified();
      this.value = r.getValue();
    }
  }
}

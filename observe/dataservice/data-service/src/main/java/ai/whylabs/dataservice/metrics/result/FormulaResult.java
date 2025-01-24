package ai.whylabs.dataservice.metrics.result;

import ai.whylabs.dataservice.metrics.MetricConstants;
import com.fasterxml.jackson.annotation.JsonTypeName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Singular;

@JsonTypeName(MetricConstants.TIMESERIES)
@Data
@EqualsAndHashCode(callSuper = true)
public class FormulaResult extends SingleQueryResult {
  @Singular("addEntry")
  List<MetricEntry> data;

  @Schema(description = "Start time (inclusive) of the interval in milliseconds since epoch")
  long startTime;

  @Schema(description = "End time (inclusive) of the interval in milliseconds since epoch")
  long endTime;

  @Schema(description = "Interval between data points in milliseconds")
  long interval;

  @Entity
  public static class MetricEntry {
    @Id public Long timestamp;
    public Double value;
  }
}

package ai.whylabs.core.structures.monitor.events.calculationOutput;

import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import lombok.Data;
import org.hibernate.annotations.Type;

@Data
@Embeddable
public class ThresholdContainer {
  @JsonPropertyDescription(
      "Value of baseline metric (if applicable, arima for example produces a range rather than single value)")
  private Double threshold_baselineMetricValue;

  @JsonPropertyDescription(
      "Value of target metric (if applicable, arima for example produces a range rather than single value)")
  private Double threshold_metricValue;

  @JsonPropertyDescription(
      "Calculations like ARIMA produce a range which we expect the target to fall within")
  private Double threshold_calculatedUpper;

  @JsonPropertyDescription(
      "Calculations like ARIMA produce a range which we expect the target to fall within")
  private Double threshold_calculatedLower;

  @JsonPropertyDescription("User supplied max upper value")
  private Double threshold_absoluteUpper;

  /**
   * Avoid REST payloads like this and null out infinity values
   *
   * <p>"threshold_absoluteUpper": "Infinity", "threshold_absoluteLower": "Infinity",
   */
  public Double getThreshold_absoluteUpper() {
    if (threshold_absoluteUpper == null || threshold_absoluteUpper.isInfinite()) {
      return null;
    }
    return threshold_absoluteUpper;
  }

  @JsonPropertyDescription("User supplied min lower value")
  private Double threshold_absoluteLower;

  /**
   * Avoid REST payloads like this and null out infinity values
   *
   * <p>"threshold_absoluteUpper": "Infinity", "threshold_absoluteLower": "Infinity",
   */
  public Double getThreshold_absoluteLower() {
    if (threshold_absoluteLower == null || threshold_absoluteLower.isInfinite()) {
      return null;
    }
    return threshold_absoluteLower;
  }

  @JsonPropertyDescription("When doing stddev, the factor")
  private Double threshold_factor;

  @JsonPropertyDescription("Minimum number of batches present for this calculation to run")
  private Integer threshold_minBatchSize;

  @JsonPropertyDescription("Threshold type (upper/lower)")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "threshold_type")
  @Type(type = "threshold_type_enum")
  private ThresholdType threshold_type;
}

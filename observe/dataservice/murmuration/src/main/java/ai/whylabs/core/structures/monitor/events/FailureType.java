package ai.whylabs.core.structures.monitor.events;

import java.io.Serializable;

public enum FailureType implements Serializable {
  MinThresholdExceedsMaxThreshold("MinThresholdExceedsMaxThreshold"),
  RollupBaselineRequired("RollupBaselineRequired"),
  InvalidJson("InvalidJson"),
  InsufficientBaseline("InsufficientBaseline"),
  CalculationException("CalculationException"),
  CompositeCalculationMissingColumns("CompositeCalculationMissingColumns"),
  IncompatibleTypes("IncompatibleTypes"),
  ConfigMissingRequiredField("ConfigMissingRequiredField"),
  MetricException("MetricException"),
  NoResults("NoResults"),
  UnknownCalculation("UnknownCalculation"),
  UnknownMetric("UnknownMetric");

  private String value;

  FailureType(String value) {
    this.value = value;
  }

  @Override
  public String toString() {
    return this.value;
  }

  /**
   * Use this in place of valueOf.
   *
   * @param value real value
   * @return FailureType corresponding to the value
   * @throws IllegalArgumentException If the specified value does not map to one of the known values
   *     in this enum.
   */
  public static FailureType fromValue(String value) {
    if (value == null || "".equals(value)) {
      throw new IllegalArgumentException("Value cannot be null or empty!");
    }

    for (FailureType enumEntry : FailureType.values()) {
      if (enumEntry.toString().equals(value)) {
        return enumEntry;
      }
    }

    throw new IllegalArgumentException("Cannot create enum from " + value + " value!");
  }
}

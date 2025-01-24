package ai.whylabs.insights;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class InsightMetricResult {
  @JsonProperty("column_name")
  String columnName;

  @JsonProperty("most_freq_estimate")
  Long mostFreqEstimate;

  @JsonProperty("most_freq_value")
  String mostFreqValue;

  Double mean;

  @JsonProperty("counts_total")
  Long countsTotal;

  @JsonProperty("counts_null")
  Long countsNull;

  @JsonProperty("types_boolean")
  Long typesBoolean;

  @JsonProperty("types_fractional")
  Long typesFractional;

  @JsonProperty("types_integral")
  Long typesIntegral;

  @JsonProperty("types_tensor")
  Long typesTensor;

  @JsonProperty("types_object")
  Long typesObject;

  @JsonProperty("min_value")
  Double minValue;

  @JsonProperty("max_value")
  Double maxValue;

  Double uniqueness;

  @JsonProperty("pattern_count")
  Long patternCount;
}

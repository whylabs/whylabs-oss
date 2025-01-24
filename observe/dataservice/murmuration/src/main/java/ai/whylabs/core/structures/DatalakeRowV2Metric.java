package ai.whylabs.core.structures;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class DatalakeRowV2Metric {
  private String metricPath;
  private byte[] kll;
  private byte[] frequentItems;
  private byte[] hll;
  private Long nSum;
  private Long nMin;
  private Long nMax;
  private Double dSum;
  private Double dMin;
  private Double dMax;

  // TODO: What do we want to do with this?
  private Double unmergeableD;
  private byte[] classificationProfile;
  private byte[] regressionProfile;

  // Variance of this column values (count, sum, mean)
  private Double[] variance;
}

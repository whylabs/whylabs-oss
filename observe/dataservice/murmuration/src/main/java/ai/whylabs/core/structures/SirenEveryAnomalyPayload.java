package ai.whylabs.core.structures;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
/**
 * This pojo models the payloads engine sends to siren via SQS. Changes must be coordinated across
 * teams with BE.
 */
public class SirenEveryAnomalyPayload implements Serializable {
  public static final String EVERY_ANOMALY = "EVERY_ANOMALY";
  private String id;
  private AnalyzerResult analyzerResult;
  private String mode;
  private Integer severity;
  private String monitorId;
  private String orgId;
  private String runId;
}

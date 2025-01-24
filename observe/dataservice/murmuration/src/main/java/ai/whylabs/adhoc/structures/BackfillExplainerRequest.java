package ai.whylabs.adhoc.structures;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@Getter
@Setter
@FieldNameConstants
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class BackfillExplainerRequest {

  // 2021-11-11T00:00:00.000Z, simulate a particular pipeline run, can be in the future
  protected String currentTime;

  // Simulate when the customer uploaded the data
  protected String uploadedTime;

  /** Required: In V3 a monitor config indicates which analyzers to run and how to run them */
  protected MonitorConfigV3 monitorConfig;
}

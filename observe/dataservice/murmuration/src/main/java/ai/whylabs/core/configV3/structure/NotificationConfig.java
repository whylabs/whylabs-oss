package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.ModeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationConfig {

  private String analysisConfigId;
  private ModeType notificationMode;
  // pagerduty/email/whateever
}

package ai.whylabs.core.configV3.structure;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class EveryAnamolyMode implements MonitorMode {
  private AnomalyFilter filter;

  @Override
  public AnomalyFilter getAnomalyFilter() {
    return filter;
  }

  // TODO - implement me
}

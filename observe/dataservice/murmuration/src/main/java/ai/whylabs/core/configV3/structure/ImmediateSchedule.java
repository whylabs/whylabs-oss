package ai.whylabs.core.configV3.structure;

import java.time.ZonedDateTime;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Data
@Builder
@NoArgsConstructor
@Slf4j
public class ImmediateSchedule implements MonitorSchedule {
  /* Schedule the monitor to run immediately. */

  public boolean isMatch(ZonedDateTime currentTime) {
    return true;
  }
}

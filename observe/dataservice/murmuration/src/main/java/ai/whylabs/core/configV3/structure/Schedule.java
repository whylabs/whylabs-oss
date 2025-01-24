package ai.whylabs.core.configV3.structure;

import java.time.ZonedDateTime;

public interface Schedule {

  /** Schedule should fire */
  boolean isMatch(ZonedDateTime currentTime);
}

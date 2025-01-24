package ai.whylabs.core.predicatesV3.baseline;

import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import lombok.val;

public class TrailingWindowExclusionPredicate {

  public boolean test(Baseline baseline, Long rollupTimestamp) {
    boolean excluded = false;
    if (baseline != null && TrailingWindowBaseline.class.isInstance(baseline)) {
      val tw = (TrailingWindowBaseline) baseline;
      if (tw.getExclusionRanges() != null) {
        for (val range : tw.getExclusionRanges()) {
          if (new TimeRangePredicate().test(range, rollupTimestamp)) {
            excluded = true;
            break;
          }
        }
      }
      if (tw.getExclusionSchedule() != null) {
        if (tw.getExclusionSchedule()
            .isMatch(
                ZonedDateTime.ofInstant(Instant.ofEpochMilli(rollupTimestamp), ZoneOffset.UTC))) {
          excluded = true;
        }
      }
    }
    return excluded;
  }
}

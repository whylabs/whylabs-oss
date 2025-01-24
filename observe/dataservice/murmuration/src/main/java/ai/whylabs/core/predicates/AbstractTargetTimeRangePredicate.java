package ai.whylabs.core.predicates;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.TargetRangeCalculator;
import com.shaded.whylabs.com.apache.commons.lang3.tuple.Pair;
import java.time.ZonedDateTime;
import lombok.val;

public class AbstractTargetTimeRangePredicate {
  private Long start;
  private Long end;
  private boolean disableTargetRollup;

  public AbstractTargetTimeRangePredicate(
      ZonedDateTime currentTime,
      Granularity modelGranularity,
      int lateWindowDays,
      boolean allowPartialTargetBatches,
      boolean disableTargetRollup) {
    this.disableTargetRollup = disableTargetRollup;

    val c =
        new TargetRangeCalculator(
            currentTime,
            modelGranularity,
            lateWindowDays,
            allowPartialTargetBatches,
            disableTargetRollup);
    start = c.getStartOfTargetBatch().toInstant().toEpochMilli();
    end = c.getEndOfTargetBatch().toInstant().toEpochMilli();
  }

  public boolean test(Long ts) {
    if (disableTargetRollup) {
      return true;
    }

    if (ts >= start && ts < end) {
      return true;
    }
    return false;
  }

  public Pair<Long, Long> getRange() {
    return Pair.of(start, end);
  }
}

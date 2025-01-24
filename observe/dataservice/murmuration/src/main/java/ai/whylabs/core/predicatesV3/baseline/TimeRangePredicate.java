package ai.whylabs.core.predicatesV3.baseline;

import ai.whylabs.core.configV3.structure.TimeRange;
import java.util.function.BiPredicate;

public class TimeRangePredicate implements BiPredicate<TimeRange, Long> {

  @Override
  public boolean test(TimeRange range, Long ts) {
    return ts >= range.getGte() && ts < range.getLt();
  }
}

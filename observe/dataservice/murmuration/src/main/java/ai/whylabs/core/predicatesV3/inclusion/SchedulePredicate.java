package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Schedule;
import java.time.ZonedDateTime;
import java.util.function.BiPredicate;
import lombok.extern.slf4j.Slf4j;

/**
 * Validate whether a datetime matches a cron expression. This is used for scheduling enable/disable
 * monitors.
 */
@Slf4j
public class SchedulePredicate implements BiPredicate<Schedule, ZonedDateTime> {
  @Override
  public boolean test(Schedule schedule, ZonedDateTime time) {
    if (schedule == null) {
      return false;
    }
    return schedule.isMatch(time);
  }
}

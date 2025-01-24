package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import java.time.ZonedDateTime;
import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;
import lombok.val;

/**
 * Does any analyzer in the monitor config care about this feature? Is that monitor both enabled and
 * the schedule matches the current job run? Yes, then we care about this feature in this job run.
 *
 * <p>This is useful for filtering out unused features while exploding.
 */
@AllArgsConstructor
public class ActiveMonitorFeaturePredicate implements BiPredicate<MonitorConfigV3, String> {
  private ZonedDateTime currentTime;

  @Override
  public boolean test(MonitorConfigV3 monitorConfigV3, String feature) {

    for (val a : monitorConfigV3.getAnalyzers()) {
      if ((a.getDisabled() == null || !a.getDisabled())
      /**
       * TODO: Re-enable once we have entity schema working. Otherwise we don't have enough info
       * during explode to do input group targeting without flickering between discrete/continuous
       * on individual datapoints. Weeding out unneeded columns during explode is just a perf
       * optimization.
       */

      // && analyzerPredicate.test(
      //    a, MonitorConfigV3Utils.getSchemaIfPresent(monitorConfigV3, feature), feature)
      ) {
        return true;
      }
    }
    return false;
  }
}

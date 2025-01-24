package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.AnomalyFilter;
import ai.whylabs.core.structures.SirenDigestPayload;
import java.util.function.BiPredicate;

/**
 * Anomaly Filters can suppress digests based on aggregated statistic thresholds. For example the
 * sum of all the anomaly weights must be above a certain threshold to send the alert.
 */
public class AnomalyFilterSirenDigestPredicate
    implements BiPredicate<SirenDigestPayload, AnomalyFilter> {

  @Override
  public boolean test(SirenDigestPayload sirenDigestPayload, AnomalyFilter anomalyFilter) {
    if (anomalyFilter == null) {
      return true;
    }

    /**
     * Only fire the monitor if the total weights of the alerts (based on feature weights) is less
     * than or equal to this value.
     */
    if (anomalyFilter.getMaxTotalWeight() != null
        && sirenDigestPayload.getTotalWeight() != null
        && sirenDigestPayload.getTotalWeight() > anomalyFilter.getMaxTotalWeight()) {
      return false;
    }

    /** Monitors with a min weight should not fire when total weight is null */
    if (anomalyFilter.getMinTotalWeight() != null && sirenDigestPayload.getTotalWeight() == null) {
      return false;
    }

    /**
     * Only fire the monitor if the total weights of the alerts (based on feature weights) is
     * greater than or equal to this value.
     */
    if (anomalyFilter.getMinTotalWeight() != null
        && sirenDigestPayload.getTotalWeight() < anomalyFilter.getMinTotalWeight()) {
      return false;
    }

    /** If the number of anomalies exceed the getMaxAlertCount threshold, the monitor won't fire. */
    if (anomalyFilter.getMaxAlertCount() != null
        && sirenDigestPayload.getNumAnomalies() > anomalyFilter.getMaxAlertCount()) {
      return false;
    }

    /**
     * If the number of anomalies are below the getMinAlertCount threshold, the monitor won't fire.
     */
    if (anomalyFilter.getMinAlertCount() != null
        && sirenDigestPayload.getNumAnomalies() < anomalyFilter.getMinAlertCount()) {
      return false;
    }

    return true;
  }
}

package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import java.util.function.BiPredicate;
import lombok.val;

/**
 * Figure out if any of the analyzers for this profileId actually care about any of the columns in
 * the request
 */
public class AdhocRequestRequiresProfilePredicate
    implements BiPredicate<AdHocMonitorRequestV3, String> {
  @Override
  public boolean test(AdHocMonitorRequestV3 request, String profileId) {
    val featurePredicate = new FeaturePredicate();
    for (Analyzer analyzer : request.getMonitorConfig().getAnalyzers()) {
      for (String c : request.getColumnNames()) {
        if (!featurePredicate.test(
            analyzer, request.getMonitorConfig().getEntitySchema().getColumns().get(c), c, 1.0)) {
          continue;
        }

        if (analyzer.getTargetMatrix() != null
            && analyzer.getTarget().getProfileId() != null
            && analyzer.getTarget().getProfileId().equals(profileId)) {
          return true;
        }

        if (analyzer.getBaseline() != null
            && analyzer.getBaseline().getClass().isAssignableFrom(ReferenceProfileId.class)
            && ((ReferenceProfileId) analyzer.getBaseline()).getProfileId().equals(profileId)) {
          return true;
        }
      }
    }
    return false;
  }
}

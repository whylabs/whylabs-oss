package ai.whylabs.core.predicatesV3.inclusion;

import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;
import lombok.Builder;

/**
 * Test whether or not there's an active backfill request for a particular dataset. We'll use this
 * strategically to open the flood gates on those datasets so that the full baseline is present.
 */
@Builder
@AllArgsConstructor
public class BackfillRequestPresentForDatasetPredicate implements BiPredicate<String, String> {
  private Boolean jobLevelOverrideFlag;

  @Override
  public boolean test(String orgId, String datasetId) {
    if (jobLevelOverrideFlag != null && jobLevelOverrideFlag) {
      return true;
    }

    return false;
  }
}

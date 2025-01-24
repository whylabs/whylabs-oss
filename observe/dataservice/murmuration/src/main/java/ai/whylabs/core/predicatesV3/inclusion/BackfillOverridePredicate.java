package ai.whylabs.core.predicatesV3.inclusion;

import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;

/**
 * Analyzer results are immutable until either the job is ran with the overwrite flag or a user
 * requests a backfill with the overwrite option
 */
@AllArgsConstructor
public class BackfillOverridePredicate implements BiPredicate<Long, Boolean> {
  private Boolean jobLevelOverrideFlag;
  private String orgId;
  private String datasetId;
  private String analyzerId;

  // TODO: add Map<Long, List<AnalyzerResult>> monitorFeedback
  @Override
  public boolean test(Long targetBatchTimestamp, Boolean eventAlreadyCalculated) {
    if (jobLevelOverrideFlag) {
      return true;
    }

    return false;
  }
}

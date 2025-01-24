package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.ZonedDateTime;
import lombok.Getter;

@Getter
public class TargetRangeCalculator {

  private ZonedDateTime endOfTargetBatch;
  private ZonedDateTime startOfTargetBatch;

  public TargetRangeCalculator(
      ZonedDateTime currentTime,
      Granularity modelGranularity,
      int lateWindowDays,
      boolean allowPartialTargetBatches,
      boolean disableTargetRollup) {
    int backfillBatches = 1;
    if (lateWindowDays > 0) {
      backfillBatches =
          Math.max(
              backfillBatches,
              ComputeJobGranularities.getLateWindowBatches(modelGranularity, lateWindowDays));
    }
    if (disableTargetRollup) {
      startOfTargetBatch = currentTime;
      endOfTargetBatch = currentTime;
      return;
    }

    ZonedDateTime adjustedTime = currentTime;
    if (allowPartialTargetBatches) {
      adjustedTime = ComputeJobGranularities.add(adjustedTime, modelGranularity, 1);
      backfillBatches++;
    }

    endOfTargetBatch = ComputeJobGranularities.truncateTimestamp(adjustedTime, modelGranularity);
    startOfTargetBatch =
        ComputeJobGranularities.subtract(endOfTargetBatch, modelGranularity, backfillBatches);
  }
}

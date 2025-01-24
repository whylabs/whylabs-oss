package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import java.time.DayOfWeek;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;

public class TargetBatchDateCalculator {

  public static ZonedDateTime getEndOfTargetBatch(
      ZonedDateTime currentTime, ChronoUnit modelGranularity, DayOfWeek weekOrigin) {
    switch (modelGranularity) {
      case HOURS:
      case DAYS:
        return currentTime.plus(1, modelGranularity);
      case WEEKS:
        return currentTime
            .plus(7, ChronoUnit.DAYS)
            .truncatedTo(ChronoUnit.DAYS)
            .with(ChronoField.DAY_OF_WEEK, weekOrigin.getValue());
      case MONTHS:
        return currentTime
            .plus(1, modelGranularity)
            .truncatedTo(ChronoUnit.DAYS)
            .with(ChronoField.DAY_OF_MONTH, 1);
      default:
        throw new IllegalArgumentException("Unsupported model granularity " + modelGranularity);
    }
  }

  public static long getTargetbatchTimestamp(
      ZonedDateTime currentTime, Granularity modelGranularity, DayOfWeek weekOrigin) {
    long targetBatchTimestamp = 0;
    switch (modelGranularity) {
      case hourly:
      case daily:
        targetBatchTimestamp =
            ComputeJobGranularities.subtract(currentTime, modelGranularity, 1)
                .toInstant()
                .toEpochMilli();
        break;
      case weekly:
        targetBatchTimestamp =
            ComputeJobGranularities.subtract(currentTime, modelGranularity, 1)
                .truncatedTo(ChronoUnit.DAYS)
                .with(ChronoField.DAY_OF_WEEK, weekOrigin.getValue())
                .toInstant()
                .toEpochMilli();
        break;
      case monthly:
        targetBatchTimestamp =
            ComputeJobGranularities.subtract(currentTime, modelGranularity, 1)
                .truncatedTo(ChronoUnit.DAYS)
                .with(ChronoField.DAY_OF_MONTH, 1)
                .toInstant()
                .toEpochMilli();
        break;
      default:
        throw new IllegalArgumentException("Unsupported model granularity " + modelGranularity);
    }
    return targetBatchTimestamp;
  }
}

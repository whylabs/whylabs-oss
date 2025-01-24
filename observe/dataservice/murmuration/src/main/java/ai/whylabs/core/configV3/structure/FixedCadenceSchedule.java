package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldNameConstants;

// spotless:off
@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FixedCadenceSchedule implements AnalyzerSchedule, MonitorSchedule {

  // Frequency to run the analyzer or monitor, based on UTC time. The monitor will run at the start
  // of the cadence with some SLA depending on the customer tiers.
  // Valid values: hourly, daily, weekly, monthly
  private Granularity cadence;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private List<TimeRange> exclusionRanges = Collections.emptyList(); // optional

  public boolean isMatch(ZonedDateTime ts) {

    if (exclusionRanges.parallelStream().anyMatch(r -> r.contains(ts))) return false;

    switch (cadence) {
      case PT15M:
        {
          if (ts.getMinute() == 15 * (ts.getMinute() / 15)) {
            return true;
          }
          break;
        }
      case hourly:
        if (ts.getMinute() == 0) {
          return true;
        }
        break;
      case daily:
        if (ts.getHour() == 0) {
          return true;
        }
        break;
      case weekly:
        if (ts.getHour() == 0 && ts.getDayOfWeek().equals(DayOfWeek.MONDAY)) {
          return true;
        }
        break;
      case monthly:
        if (ts.getHour() == 0 && ts.getDayOfMonth() == 1) {
          return true;
        }
        break;
    }
    return false;
  }

  // Today's data becomes the first datapoint to be analyzed once the day is over
  @Override
  public ZonedDateTime getInitialTargetBucket(ZonedDateTime from, Granularity datasetGranularity) {
    return ComputeJobGranularities.truncateTimestamp(from, cadence);
  }

  // The next target bucket is +1 cadence
  @Override
  public ZonedDateTime getNextTargetBucket(ZonedDateTime previousTargetBucket) {
    return ComputeJobGranularities.add(previousTargetBucket, cadence, 1);
  }

  @Override
  public ZonedDateTime getNextFire(
      ZonedDateTime targetBucket, Duration dataReadinessDuration, Granularity datasetGranularity) {
    /**
     * Ok you can have a weekly analyzer for a daily dataset. In that scenario getNextTargetBucket
     * bounces the target from one monday to the next. That analyzer becomes eligable for running
     * tuesday at midnight which is why we increment by datasetGranularity rather than analyzer
     * granularity. All about when the target bucket has concluded.
     */
    val t = ComputeJobGranularities.add(targetBucket, datasetGranularity, 1);
    if (dataReadinessDuration != null) {
      return t.plus(dataReadinessDuration);
    }
    return t;
  }
}

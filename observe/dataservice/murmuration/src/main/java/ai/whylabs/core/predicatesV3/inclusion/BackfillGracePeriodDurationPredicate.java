package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.BackfillGracePeriodCalculator;
import ai.whylabs.core.utils.TriPredicate;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import lombok.AllArgsConstructor;

/**
 * From the schema definition: "ISO 8610 duration format. How far the monitor should wait to
 * generate events once the data arrives. We support 48 hours for houlry data,30 days for daily
 * data, and 6 months for monthly data"
 *
 * <p>First time you upload data we'll back fill some analysis for it automatically for free via
 * late windowing mechanisms. Suppose you upload 30d worth of data and wanna see how the arima
 * calculation trendlines look you get that for free. You can upload years of data to use as a
 * baseline, we're just talking about back filling the analysis.
 *
 * <p>After the grace period freebie, you have to pay to overwrite previous calculations. This
 * predicate just focuses on making sure we aren't back filling more than the user's specified grace
 * period. Not everyone wants automatic backfills.
 */
@AllArgsConstructor
public class BackfillGracePeriodDurationPredicate
    implements TriPredicate<Granularity, Analyzer, Long> {

  private ZonedDateTime currentTime;
  private boolean overwriteEvents;

  /**
   * This is a gate, returns true if the calculation may proceed. False the target batch timestamp
   * is outside the grace period
   */
  public boolean test(Granularity modelGranularity, Analyzer analyzer, Long targetBatchTimestamp) {
    if (currentTime == null) {
      // Not a real scenario, just makes unit testing easier
      return true;
    }
    if (overwriteEvents == true) {
      // We're running this job out of band to overwrite something that went south, open up the gate
      return true;
    }

    long cutoff;
    if (analyzer.getBackfillGracePeriodDuration() == null) {
      cutoff =
          currentTime
              .minus(BackfillGracePeriodCalculator.getDays(modelGranularity), ChronoUnit.DAYS)
              .toInstant()
              .toEpochMilli();
    } else {
      cutoff =
          currentTime.minus(analyzer.getBackfillGracePeriodDuration()).toInstant().toEpochMilli();
    }

    if (targetBatchTimestamp < cutoff) {
      return false;
    }

    return true;
  }

  public static int getDays(Analyzer analyzer, Granularity datasetGranularity) {
    if (analyzer.getBackfillGracePeriodDuration() == null) {
      return BackfillGracePeriodCalculator.getDays(datasetGranularity);
    } else {
      return new Long(analyzer.getBackfillGracePeriodDuration().toDays()).intValue();
    }
  }

  public static int getMaxBackfill(MonitorConfigV3 config) {
    int i = 0;
    for (Analyzer a : config.getAnalyzers()) {
      int c = getDays(a, config.getGranularity());
      if (c > i) {
        i = c;
      }
    }
    return i;
  }
}

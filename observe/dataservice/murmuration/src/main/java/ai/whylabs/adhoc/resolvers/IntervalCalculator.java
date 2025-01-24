package ai.whylabs.adhoc.resolvers;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.AbstractBaselineTimerangePredicateV3;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;

@Slf4j
public class IntervalCalculator {

  /**
   * Given a monitor config and a target range, get a list of all intervals for which data must be
   * gathered to do the calculation. Overlapping intervals are merged together to ensure we're not
   * double resolving any data
   */
  public static List<Interval> getIntervals(MonitorConfigV3 config, Interval targetRange) {
    List<Interval> intervals = new ArrayList();
    intervals.add(targetRange);
    for (val a : config.getAnalyzers()) {
      val interval = getInterval(config.getGranularity(), targetRange, a);
      if (interval != null) intervals.add(interval);
    }
    if (intervals.size() == 1) {
      return intervals;
    }

    return IntervalCollapser.merge(intervals);
  }

  public static Interval getInterval(Granularity granularity, Interval targetRange, Analyzer a) {
    if (a.getBaseline() != null) {
      val baselineIntervalResolver =
          new BaselineIntervalResolver(
              targetRange.getStartMillis(), granularity, 0, a.getBaseline(), a);
      try {
        val range = baselineIntervalResolver.getRange();
        return new Interval(range.getLeft(), range.getRight());
      } catch (IllegalArgumentException e) {
        log.trace("Baseline does produce a range", e);
      }
    } else if (a.getTargetSize() != null && a.getTargetSize() > 1) {
      val backdated =
          ComputeJobGranularities.subtract(
                  ZonedDateTime.ofInstant(
                      Instant.ofEpochMilli(targetRange.getStart().toInstant().getMillis()),
                      ZoneOffset.UTC),
                  granularity,
                  a.getTargetSize())
              .toInstant()
              .toEpochMilli();
      return new Interval(backdated, targetRange.getStartMillis());
    }
    return null;
  }

  static class BaselineIntervalResolver extends AbstractBaselineTimerangePredicateV3 {

    public BaselineIntervalResolver(
        long targetBatchTimestamp,
        Granularity granularity,
        int lateWindowDays,
        Baseline baseline,
        Analyzer analyzer) {
      super(targetBatchTimestamp, granularity, lateWindowDays, baseline, analyzer.getTargetSize());
    }
  }
}

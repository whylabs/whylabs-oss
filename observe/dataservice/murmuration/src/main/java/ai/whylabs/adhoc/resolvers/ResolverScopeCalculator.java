package ai.whylabs.adhoc.resolvers;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.val;

/**
 * Do an adhoc query against 2022-10-02/2022-10-10 and you'll find that the date 2022-10-02 has
 * insufficient baseline because we need to query druid for more data. Suppose two baseline configs
 * had trailing=7D and trailing=14D this method calculates an expanded query interval to fetch data
 * from druid with favoring the 14D option.
 */
public class ResolverScopeCalculator {

  public static Set<QueryTimeRange> resolveIntervals(
      AdHocMonitorRequestV3 request, ZonedDateTime start, ZonedDateTime end) {
    Set<QueryTimeRange> ranges = new LinkedHashSet<>();
    if (request.getMonitorConfig().getAnalyzers() == null) {
      ranges.add(QueryTimeRange.builder().start(start).end(end).build());
      return ranges;
    }

    Integer largestTrailingWindowSize = 0;
    Integer largestTrailingWindowOffset = 0;
    for (val a : request.getMonitorConfig().getAnalyzers()) {
      val baseline = a.getBaseline();
      if (baseline == null) {
        continue;
      }
      // Trailing Window
      if (baseline.getClass().isAssignableFrom(TrailingWindowBaseline.class)) {
        val trailingWindow = (TrailingWindowBaseline) baseline;
        if (trailingWindow.getSize() != null) {
          largestTrailingWindowSize = Math.max(largestTrailingWindowSize, trailingWindow.getSize());
        }
        if (trailingWindow.getOffset() != null) {
          largestTrailingWindowOffset =
              Math.max(largestTrailingWindowOffset, trailingWindow.getOffset());
        }
      }

      // Time Range
      if (baseline.getClass().isAssignableFrom(TimeRangeBaseline.class)) {
        val timeRangeBaseline = (TimeRangeBaseline) baseline;
        ranges.add(
            QueryTimeRange.builder()
                .start(
                    ZonedDateTime.parse(
                        timeRangeBaseline.getRange().getStart(),
                        DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .end(
                    ZonedDateTime.parse(
                        timeRangeBaseline.getRange().getEnd(),
                        DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .build());
      }

      // Single Batch
      if (baseline.getClass().isAssignableFrom(SingleBatchBaseline.class)) {
        val singleBatchBaseline = (SingleBatchBaseline) baseline;
        if (singleBatchBaseline.getOffset() != null) {
          largestTrailingWindowOffset =
              Math.max(largestTrailingWindowOffset, singleBatchBaseline.getOffset());
        }
      }
    }
    // For trailing windows and single batch baselines we want to expand the start date to encompass
    // the largest window within the baseline configs

    start =
        ComputeJobGranularities.subtract(
            start,
            request.getMonitorConfig().getGranularity(),
            largestTrailingWindowSize + largestTrailingWindowOffset);
    ranges.add(QueryTimeRange.builder().start(start).end(end).build());

    return ranges;
  }
}

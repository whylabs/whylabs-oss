package ai.whylabs.batch;

import static org.junit.Assert.assertTrue;
import static org.testng.Assert.assertFalse;
import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Analyzers.StddevConfig;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.inclusion.SecondsSinceLastUploadPredicate;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import lombok.val;
import org.testng.annotations.Test;

public class MultiGranularityTests {

  @Test
  public void testSecondsSinceLastUploadPredicate() {
    val p = new SecondsSinceLastUploadPredicate();
    val feedbackLoop = new HashMap<Long, Map<String, AnalyzerResult>>();
    val PT15M = FixedCadenceSchedule.builder().cadence(Granularity.PT15M).build();
    val hourly = FixedCadenceSchedule.builder().cadence(Granularity.hourly).build();
    val daily = FixedCadenceSchedule.builder().cadence(Granularity.daily).build();
    val weekly = FixedCadenceSchedule.builder().cadence(Granularity.weekly).build();
    val monthly = FixedCadenceSchedule.builder().cadence(Granularity.monthly).build();

    val a1 =
        Analyzer.builder()
            .id("analyzer1")
            .disabled(false)
            .config(
                StddevConfig.builder()
                    .version(1)
                    .metric("secondsSinceLastUpload")
                    .minBatchSize(14)
                    .factor(2.0)
                    .build())
            .targetMatrix(DatasetMatrix.builder().build())
            .schedule(hourly)
            .build();

    val currentTime = ZonedDateTime.of(2021, 9, 22, 2, 0, 0, 0, ZoneOffset.UTC);
    val currentTimeMinusTwoHours = ZonedDateTime.of(2021, 9, 22, 0, 0, 0, 0, ZoneOffset.UTC);
    assertTrue(p.test(a1, currentTime, feedbackLoop));

    HashMap<String, AnalyzerResult> i = new HashMap<>();
    i.put(a1.getId(), new AnalyzerResult());
    feedbackLoop.put(currentTimeMinusTwoHours.toInstant().toEpochMilli(), i);
    assertTrue(p.test(a1, currentTime, feedbackLoop));
    a1.setSchedule(daily);
    assertFalse(p.test(a1, currentTime, feedbackLoop));
    assertTrue(p.test(a1, currentTime.plusDays(2), feedbackLoop));
    a1.setSchedule(weekly);
    assertFalse(p.test(a1, currentTime, feedbackLoop));
    assertTrue(p.test(a1, currentTime.plusDays(9), feedbackLoop));
    a1.setSchedule(monthly);
    assertFalse(p.test(a1, currentTime, feedbackLoop));
    assertTrue(p.test(a1, currentTime.plusDays(33), feedbackLoop));
  }

  @Test
  public void testWeeklyTargetStart() {
    val currentTime = ZonedDateTime.of(2021, 9, 22, 2, 0, 0, 0, ZoneOffset.UTC);
    assertEquals(
        20,
        ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.weekly).getDayOfMonth());
    assertEquals(
        0, ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.weekly).getHour());
  }

  @Test
  public void testDailyTargetStart() {
    val currentTime = ZonedDateTime.of(2021, 9, 22, 2, 0, 0, 0, ZoneOffset.UTC);
    assertEquals(
        22,
        ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.daily).getDayOfMonth());
    assertEquals(
        0, ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.daily).getHour());
  }

  @Test
  public void testHourlyTargetStart() {
    val currentTime = ZonedDateTime.of(2021, 9, 22, 2, 5, 0, 0, ZoneOffset.UTC);
    assertEquals(
        22,
        ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.hourly).getDayOfMonth());
    assertEquals(
        2, ComputeJobGranularities.truncateTimestamp(currentTime, Granularity.hourly).getHour());
  }

  @Test
  public void testMonthlyTimeRangeBaseline() {
    val aprilFirst = ZonedDateTime.of(2022, 4, 5, 0, 0, 0, 0, ZoneOffset.UTC);
    val mayFirst = ZonedDateTime.of(2022, 5, 5, 0, 0, 0, 0, ZoneOffset.UTC);
    val mayFirstNextYear = ZonedDateTime.of(2023, 5, 5, 0, 0, 0, 0, ZoneOffset.UTC);

    val r =
        TimeRange.builder()
            .gte(aprilFirst.toInstant().toEpochMilli())
            .lt(mayFirst.toInstant().toEpochMilli())
            .build();
    val rNextYear =
        TimeRange.builder()
            .gte(aprilFirst.toInstant().toEpochMilli())
            .lt(mayFirstNextYear.toInstant().toEpochMilli())
            .build();
    assertEquals(
        1,
        TimeRangeBaseline.builder()
            .range(r)
            .build()
            .getExpectedBaselineDatapoints(Granularity.monthly),
        0);
    assertEquals(
        13,
        TimeRangeBaseline.builder()
            .range(rNextYear)
            .build()
            .getExpectedBaselineDatapoints(Granularity.monthly),
        0);
    assertEquals(
        4,
        TimeRangeBaseline.builder()
            .range(r)
            .build()
            .getExpectedBaselineDatapoints(Granularity.weekly),
        0);
    assertEquals(
        30,
        TimeRangeBaseline.builder()
            .range(r)
            .build()
            .getExpectedBaselineDatapoints(Granularity.daily),
        0);
    assertEquals(
        720,
        TimeRangeBaseline.builder()
            .range(r)
            .build()
            .getExpectedBaselineDatapoints(Granularity.hourly),
        0);
  }
}

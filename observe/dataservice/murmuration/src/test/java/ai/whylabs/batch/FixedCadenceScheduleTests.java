package ai.whylabs.batch;

import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertTrue;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.FixedCadenceSchedule;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.predicatesV3.inclusion.BackfillGracePeriodDurationPredicate;
import ai.whylabs.core.predicatesV3.inclusion.BatchCooldownPredicate;
import ai.whylabs.core.predicatesV3.inclusion.DataReadinessDurationPredicate;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import lombok.val;
import org.testng.annotations.Test;

public class FixedCadenceScheduleTests {

  @Test
  public void testFixedCadenceSchedule() {
    val PT15M = FixedCadenceSchedule.builder().cadence(Granularity.PT15M).build();
    val hourly = FixedCadenceSchedule.builder().cadence(Granularity.hourly).build();
    val daily = FixedCadenceSchedule.builder().cadence(Granularity.daily).build();
    val weekly = FixedCadenceSchedule.builder().cadence(Granularity.weekly).build();
    val monthly = FixedCadenceSchedule.builder().cadence(Granularity.monthly).build();

    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val aprilFirstTwoFortyFive = ZonedDateTime.of(2022, 4, 1, 2, 45, 0, 0, ZoneOffset.UTC);
    val aprilFirstTwoFortySix = ZonedDateTime.of(2022, 4, 1, 2, 46, 0, 0, ZoneOffset.UTC);
    val aprilSecond = ZonedDateTime.of(2022, 4, 2, 0, 0, 0, 0, ZoneOffset.UTC);
    val monday = ZonedDateTime.of(2022, 4, 4, 0, 0, 0, 0, ZoneOffset.UTC);
    val twoPm = ZonedDateTime.of(2022, 4, 4, 14, 0, 0, 0, ZoneOffset.UTC);

    assertTrue(weekly.isMatch(monday));
    assertFalse(weekly.isMatch(aprilSecond));
    assertFalse(weekly.isMatch(twoPm));
    assertFalse(weekly.isMatch(aprilFirstTwoFortyFive));

    assertTrue(daily.isMatch(monday));
    assertTrue(daily.isMatch(aprilSecond));
    assertTrue(daily.isMatch(aprilFirst));
    assertFalse(daily.isMatch(twoPm));
    assertFalse(daily.isMatch(aprilFirstTwoFortyFive));

    assertTrue(hourly.isMatch(monday));
    assertTrue(hourly.isMatch(aprilSecond));
    assertTrue(hourly.isMatch(aprilFirst));
    assertTrue(hourly.isMatch(twoPm));
    assertFalse(hourly.isMatch(aprilFirstTwoFortyFive));

    assertTrue(PT15M.isMatch(monday));
    assertTrue(PT15M.isMatch(aprilSecond));
    assertTrue(PT15M.isMatch(aprilFirst));
    assertTrue(PT15M.isMatch(twoPm));
    assertTrue(PT15M.isMatch(aprilFirstTwoFortyFive));
    assertFalse(PT15M.isMatch(aprilFirstTwoFortySix));

    assertTrue(monthly.isMatch(aprilFirst));
    assertFalse(monthly.isMatch(aprilSecond));
    assertFalse(monthly.isMatch(twoPm));
  }

  @Test
  public void testOffsetMinutes() {
    String offset = "PT15m";
    val hourly = FixedCadenceSchedule.builder().cadence(Granularity.hourly).build();
    val daily = FixedCadenceSchedule.builder().cadence(Granularity.daily).build();
    val weekly = FixedCadenceSchedule.builder().cadence(Granularity.weekly).build();
    val monthly = FixedCadenceSchedule.builder().cadence(Granularity.monthly).build();

    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val aprilSecond = ZonedDateTime.of(2022, 4, 2, 0, 0, 0, 0, ZoneOffset.UTC);
    val monday = ZonedDateTime.of(2022, 4, 4, 0, 0, 0, 0, ZoneOffset.UTC);
    val twoPm = ZonedDateTime.of(2022, 4, 4, 14, 0, 0, 0, ZoneOffset.UTC);

    assertTrue(weekly.isMatch(monday));
    assertFalse(weekly.isMatch(monday.plusHours(2)));
    assertFalse(weekly.isMatch(aprilSecond));
    assertFalse(weekly.isMatch(aprilSecond.plusHours(2)));
    assertFalse(weekly.isMatch(twoPm));
    assertFalse(weekly.isMatch(twoPm.plusHours(2)));

    assertTrue(daily.isMatch(monday));
    assertFalse(daily.isMatch(monday.plusHours(2)));
    assertTrue(daily.isMatch(aprilSecond));
    assertFalse(daily.isMatch(aprilSecond.plusHours(2)));
    assertTrue(daily.isMatch(aprilFirst));
    assertFalse(daily.isMatch(aprilFirst.plusHours(2)));
    assertFalse(daily.isMatch(twoPm));
    assertFalse(daily.isMatch(twoPm.plusHours(2)));

    assertTrue(hourly.isMatch(monday));
    assertTrue(hourly.isMatch(aprilSecond));
    assertTrue(hourly.isMatch(aprilFirst));
    assertTrue(hourly.isMatch(twoPm));

    assertTrue(monthly.isMatch(aprilFirst));
    assertFalse(monthly.isMatch(aprilFirst.plusHours(2)));
    assertFalse(monthly.isMatch(aprilSecond));
    assertFalse(monthly.isMatch(twoPm));
  }

  @Test
  public void testBatchCooldownPredicate() {
    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val fifteenMinuteOffsetAnalyzer =
        Analyzer.builder().batchCoolDownPeriod(Duration.ofMinutes(15)).build();

    val nullUploadTs = new QueryResultStructure(ExplodedRow.builder().build(), null);
    assertTrue(
        new BatchCooldownPredicate(aprilFirst)
            .test(Arrays.asList(nullUploadTs), fifteenMinuteOffsetAnalyzer));

    val tooFresh =
        new QueryResultStructure(
            ExplodedRow.builder()
                .lastUploadTs(aprilFirst.toInstant().minusSeconds(1).toEpochMilli())
                .build(),
            null);
    assertFalse(
        new BatchCooldownPredicate(aprilFirst)
            .test(Arrays.asList(tooFresh), fifteenMinuteOffsetAnalyzer));

    val oldEnough =
        new QueryResultStructure(
            ExplodedRow.builder()
                .lastUploadTs(aprilFirst.minusMinutes(20).toInstant().toEpochMilli())
                .build(),
            null);
    assertTrue(
        new BatchCooldownPredicate(aprilFirst)
            .test(Arrays.asList(oldEnough), fifteenMinuteOffsetAnalyzer));

    // Null scenario
    val nullCooldownAnalyzer = Analyzer.builder().build();
    assertTrue(
        new BatchCooldownPredicate(aprilFirst).test(Arrays.asList(tooFresh), nullCooldownAnalyzer));

    // Daily
    val weekOffsetAnalyzer =
        Analyzer.builder().batchCoolDownPeriod(Duration.of(7, ChronoUnit.DAYS)).build();
    assertFalse(
        new BatchCooldownPredicate(aprilFirst).test(Arrays.asList(tooFresh), weekOffsetAnalyzer));
  }

  @Test
  public void testBackfillGracePeriodDurationPredicate() {
    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val predicate = new BackfillGracePeriodDurationPredicate(aprilFirst, false);
    val backfill30DAnalyzer =
        Analyzer.builder().backfillGracePeriodDuration(Duration.ofDays(30)).build();
    val backfill2HAnalyzer =
        Analyzer.builder().backfillGracePeriodDuration(Duration.ofHours(2)).build();

    val backfillDefaultDAnalyzer = Analyzer.builder().build();

    assertTrue(
        predicate.test(
            Granularity.hourly,
            backfill30DAnalyzer,
            aprilFirst.minusDays(1).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.hourly,
            backfill2HAnalyzer,
            aprilFirst.minusHours(1).toInstant().toEpochMilli()));
    assertFalse(
        predicate.test(
            Granularity.hourly,
            backfill2HAnalyzer,
            aprilFirst.minusDays(1).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.daily,
            backfill30DAnalyzer,
            aprilFirst.minusDays(15).toInstant().toEpochMilli()));
    assertFalse(
        predicate.test(
            Granularity.daily,
            backfill30DAnalyzer,
            aprilFirst.minusDays(32).toInstant().toEpochMilli()));
    assertFalse(
        predicate.test(
            Granularity.hourly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(35).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.monthly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(15).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.weekly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(15).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.monthly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(90).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.weekly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(90).toInstant().toEpochMilli()));
    assertTrue(
        predicate.test(
            Granularity.monthly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(90).toInstant().toEpochMilli()));
    assertFalse(
        predicate.test(
            Granularity.monthly,
            backfillDefaultDAnalyzer,
            aprilFirst.minusDays(365).toInstant().toEpochMilli()));

    // Overwrite mode at the job level opens flood gates
    assertTrue(
        new BackfillGracePeriodDurationPredicate(aprilFirst, true)
            .test(
                Granularity.monthly,
                backfillDefaultDAnalyzer,
                aprilFirst.minusDays(365).toInstant().toEpochMilli()));
  }

  @Test
  public void testDataReadinessDuration() {
    val aprilFirst = ZonedDateTime.of(2022, 4, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val predicate = new DataReadinessDurationPredicate(aprilFirst);
    val readinessNotSpecified = Analyzer.builder().build();

    val readiness1d = Analyzer.builder().dataReadinessDuration(Duration.ofDays(1)).build();

    assertTrue(
        predicate.test(
            readinessNotSpecified, aprilFirst.minusMinutes(1).toInstant().toEpochMilli()));
    assertFalse(predicate.test(readiness1d, aprilFirst.minusMinutes(1).toInstant().toEpochMilli()));
    assertTrue(predicate.test(readiness1d, aprilFirst.minusDays(2).toInstant().toEpochMilli()));
    assertTrue(predicate.test(readiness1d, aprilFirst.minusDays(20).toInstant().toEpochMilli()));
  }
}

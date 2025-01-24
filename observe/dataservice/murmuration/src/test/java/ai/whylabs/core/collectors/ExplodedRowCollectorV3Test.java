package ai.whylabs.core.collectors;

import static org.testng.Assert.*;

import ai.whylabs.core.aggregation.ExplodedRowMerge;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.structures.ExplodedRow;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.function.LongFunction;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import lombok.val;
import org.testng.annotations.Test;

public class ExplodedRowCollectorV3Test {

  @Test
  public void testCompleteBaseline() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = TrailingWindowBaseline.builder().size(14).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            false,
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .segmentText("")
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 ExplodedRows.
    // The first will be collected as a target row,
    // The next 14 will be collected as baseline rows.
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);

    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    assertEquals(targetBatchTimestamps.size(), 1);

    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      val m = collector.getBaselineBuckets(targetBatchTimestamp);

      // Expect get 14-day trailing baseline
      assertEquals(m.size(), 14);
      for (val e : m.entrySet()) {
        // collector.getBaselineBuckets can synthesize missing rows in the baseline if necessary.
        // Our baseline is complete and should not need any synthesis.
        assertNotNull(e.getValue().getCounters_count());
      }
    }
  }

  @Test
  public void testTraceId() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = TrailingWindowBaseline.builder().size(14).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            false,
            0,
            TargetLevel.column,
            null,
            true); // Notably different from all the other unit tests here

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .segmentText("")
              .missing(false)
              .ingestionMetricRow(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .traceIds(new ArrayList<>(Arrays.asList(new Long(i).toString())))
              .targetLevel(TargetLevel.column)
              // Notable that we're 4sec into the hour
              .ts(currentTime.minusDays(i).plusSeconds(4).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 ExplodedRows.
    // The first will be collected as a target row,
    // The next 14 will be collected as baseline rows.
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);

    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    assertEquals(targetBatchTimestamps.size(), 15);

    for (val t : targetBatchTimestamps) {
      // Target is configured not to be rolled up
      assertEquals(4, ZonedDateTime.ofInstant(Instant.ofEpochMilli(t), ZoneOffset.UTC).getSecond());
    }

    int baselinePresent = 0;
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      val m = collector.getBaselineBuckets(targetBatchTimestamp);

      for (val e : m.entrySet()) {
        // collector.getBaselineBuckets can synthesize missing rows in the baseline if necessary.
        // Our baseline is complete and should not need any synthesis.
        // assertNotNull(e.getValue().getCounters_count());

        if (!e.getValue().getMissing()) {
          baselinePresent++;
          assertEquals(1, e.getValue().getTraceIds().size());
          assertEquals(
              0,
              ZonedDateTime.ofInstant(Instant.ofEpochMilli(e.getKey()), ZoneOffset.UTC)
                  .getSecond());
        }
      }
    }

    assertEquals(105, baselinePresent);

    val merged =
        new ExplodedRowMerge()
            .merge(
                LongStream.rangeClosed(1, 15)
                    .mapToObj(int2ExplodedRow)
                    .collect(Collectors.toList()));
    assertEquals(ExplodedRowMerge.MAX_TRACE_ID_SAMPLE_SIZE, merged.getTraceIds().size());
  }

  @Test
  public void testAllowPartialTargetBatchesOnMonthlyModel() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = TrailingWindowBaseline.builder().size(14).build();
    val lateWindowDays = 0;
    val partialTimestampCollector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder()
                .allowPartialTargetBatches(true)
                .granularity(Granularity.monthly)
                .build(),
            baseline,
            lateWindowDays,
            false,
            0,
            TargetLevel.column,
            null,
            false);

    val standardCollector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.monthly).build(),
            baseline,
            lateWindowDays,
            false,
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .segmentText("")
              .missing(false)
              .ingestionMetricRow(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 ExplodedRows.
    // The first will be collected as a target row,
    // The next 14 will be collected as baseline rows.
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(standardCollector::collect);
    LongStream.rangeClosed(1, 15)
        .mapToObj(int2ExplodedRow)
        .forEach(partialTimestampCollector::collect);

    val targetBatchTimestamps = standardCollector.getTargetBuckets();
    assertEquals(targetBatchTimestamps.size(), 0);

    val targetBatchTimestamps2 = partialTimestampCollector.getTargetBuckets();
    assertEquals(targetBatchTimestamps2.size(), 1);
  }

  @Test
  public void testTargetExcludesReferenceProfilesEvenDuringOverrideEvents() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = TrailingWindowBaseline.builder().size(14).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            true, // Job level override enabled for this corner case
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .profileId("blah") // It's a ref profile now
              .segmentText("")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 reference profiles, they should all be excluded from target
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);
    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      assertTrue(collector.getTarget(targetBatchTimestamp).getMissing());
    }
  }

  /** test that TrailingWindowBaseline baselines do not include any reference profiles. */
  @Test
  public void testBaselineExcludesReferenceProfiles() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    val windowSize = 14;
    Baseline baseline = TrailingWindowBaseline.builder().size(windowSize).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            true, // Job level override enabled for this corner case
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .profileId("blah") // It's a ref profile now
              .segmentText("")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 reference profiles, they should all be excluded from baseline
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);
    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      val buckets = collector.getBaselineBuckets(targetBatchTimestamp);
      assertEquals(buckets.size(), windowSize);
      // should not see any reference profiles in baseline.
      buckets.entrySet().stream().forEach(e -> assertNull(e.getValue().getProfileId()));
    }
  }

  /**
   * Reference and regular profiles for the same date may be collected in any order. Test what
   * happens when a regular profile is collected before reference profile with same timestamp.
   */
  @Test
  public void testCollectRegularProfileFirst() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = ReferenceProfileId.builder().profileId("blah").build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            true, // Job level override enabled for this corner case
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .segmentText("")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect 15 NON-reference profiles, they should all be excluded from baseline
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);
    // Collect a single reference within the baseline date interval
    LongStream.range(1, 2)
        .mapToObj(int2ExplodedRow)
        .map(
            e -> {
              e.setProfileId("blah");
              return e;
            })
        .forEach(collector::collect);

    // assert that ONLY the reference profile is included in the baseline
    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      // we should get the same reference profile for all targetBatchTimestamp values
      val buckets = collector.getBaselineBuckets(targetBatchTimestamp);
      assertEquals(buckets.size(), 1);
      buckets.entrySet().stream().forEach(e -> assertEquals(e.getValue().getProfileId(), "blah"));
    }
  }

  /**
   * Reference and regular profiles for the same date may be collected in any order. Test what
   * happens when a reference profile is collected before regular profile with same timestamp.
   */
  @Test
  public void testCollectReferenceFirst() {
    final String REFERENCE_ID = "reference-profile-id";
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = ReferenceProfileId.builder().profileId(REFERENCE_ID).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            true, // Job level override enabled for this corner case
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .segmentText("")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect a single reference within the baseline date interval
    LongStream.range(1, 2)
        .mapToObj(int2ExplodedRow)
        .map(
            e -> {
              e.setProfileId(REFERENCE_ID);
              return e;
            })
        .forEach(collector::collect);
    // Collect 15 NON-reference profiles, they should all be excluded from baseline
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);

    // assert that ONLY the reference profile is included in the baseline
    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      // we should get the same reference profile for all targetBatchTimestamp values
      val buckets = collector.getBaselineBuckets(targetBatchTimestamp);
      assertEquals(buckets.size(), 1);
      buckets.entrySet().stream()
          .forEach(e -> assertEquals(e.getValue().getProfileId(), REFERENCE_ID));
      buckets.entrySet().stream()
          .forEach(e -> assertEquals((long) e.getValue().getCounters_count(), 1));
    }
  }

  /** Verify reference profiles with different timestamps but the same profileId get merged. */
  @Test
  public void testCollectMultipleReference() {
    final String REFERENCE_ID = "reference-profile-id";
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    Baseline baseline = ReferenceProfileId.builder().profileId(REFERENCE_ID).build();
    val lateWindowDays = 0;
    val collector =
        new ExplodedRowCollectorV3(
            currentTime,
            MonitorConfigV3.builder().granularity(Granularity.daily).build(),
            baseline,
            lateWindowDays,
            true, // Job level override enabled for this corner case
            0,
            TargetLevel.column,
            null,
            false);

    LongFunction<ExplodedRow> int2ExplodedRow =
        (long i) -> {
          return ExplodedRow.builder()
              .orgId("org-0")
              .datasetId("model-303")
              .columnName("featureA")
              .ingestionMetricRow(false)
              .missing(false)
              .aggregationDataGranularity(AggregationDataGranularity.ROLLED_UP)
              .segmentText("")
              .targetLevel(TargetLevel.column)
              .ts(currentTime.minusDays(i).toInstant().toEpochMilli())
              .counters_count(i)
              .build();
        };

    // Collect multiple reference within the baseline date interval.
    //
    // NOTE mock rows will have different timestamps.  Collector should merge together based on
    // profileId.
    LongStream.range(1, 4)
        .mapToObj(int2ExplodedRow)
        .map(
            e -> {
              e.setProfileId(REFERENCE_ID);
              return e;
            })
        .forEach(collector::collect);

    // Throw in 15 NON-reference profiles, they should all be excluded from baseline
    LongStream.rangeClosed(1, 15).mapToObj(int2ExplodedRow).forEach(collector::collect);

    // expect reference profile to be only entry in baseline
    val targetBatchTimestamps = collector.getPotentialTargetBatchTimestamps(Duration.ofDays(1));
    for (Long targetBatchTimestamp : targetBatchTimestamps) {
      // expect a single reference profile for all targetBatchTimestamp values
      val buckets = collector.getBaselineBuckets(targetBatchTimestamp);
      assertEquals(buckets.size(), 1);
      buckets.entrySet().stream()
          .forEach(e -> assertEquals(e.getValue().getProfileId(), REFERENCE_ID));
      // expect count is sum from merging reference profiles.
      buckets.entrySet().stream()
          .forEach(e -> assertEquals((long) e.getValue().getCounters_count(), 6));
    }
  }
}

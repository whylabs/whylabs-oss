package ai.whylabs.batch;

import static org.testng.AssertJUnit.assertFalse;
import static org.testng.AssertJUnit.assertTrue;

import ai.whylabs.batch.MapFunctions.DigestModeAnomalyFilter;
import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.ImmediateSchedule;
import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.predicatesV3.siren.DigestApplicablePredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.MonitorDigest;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.UUID;
import lombok.val;
import org.testng.annotations.Test;

public class DigestModeAnomalyFilterTest {

  @Test
  public void testImmediateScheduleRespectsRunId() throws Exception {
    String runId = UUID.randomUUID().toString();
    val wednesday = ZonedDateTime.of(2022, 4, 6, 0, 0, 0, 0, ZoneOffset.UTC);
    val filter = new DigestModeAnomalyFilter(wednesday, runId);

    val monitor =
        Monitor.builder()
            .analyzerIds(Arrays.asList("blah"))
            .schedule(ImmediateSchedule.builder().build())
            .mode(DigestMode.builder().build())
            .build();

    val d = MonitorDigest.builder().monitorJson(MonitorConfigV3JsonSerde.toJson(monitor)).build();
    val a =
        AnalyzerResult.builder()
            .creationTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
            .datasetTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
            .runId(runId)
            .build();

    // Immediate mode filters down to only the current runId
    assertTrue(filter.call(d, a).isPresent());
    a.setRunId("different");
    assertFalse(filter.call(d, a).isPresent());
  }

  @Test
  public void testImmediateScheduleRespectsOffsetDurations() throws Exception {
    String runId = UUID.randomUUID().toString();
    val wednesday = ZonedDateTime.of(2022, 4, 6, 0, 0, 0, 0, ZoneOffset.UTC);
    val filter = new DigestModeAnomalyFilter(wednesday, runId);

    val monitor =
        Monitor.builder()
            .analyzerIds(Arrays.asList("blah"))
            .schedule(ImmediateSchedule.builder().build())
            .mode(
                DigestMode.builder()
                    .datasetTimestampOffset("P1D")
                    .creationTimeOffset("P1D")
                    .build())
            .build();

    val d = MonitorDigest.builder().monitorJson(MonitorConfigV3JsonSerde.toJson(monitor)).build();
    val a =
        AnalyzerResult.builder()
            .creationTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
            .datasetTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
            .runId(runId)
            .build();

    // Immediate mode filters down to only the current runId
    assertTrue(filter.call(d, a).isPresent());
    // 1d1h is older than the P1D datasetTimestampOffset
    a.setDatasetTimestamp(wednesday.minusDays(1).minusHours(1).toInstant().toEpochMilli());
    assertFalse(filter.call(d, a).isPresent());
    a.setDatasetTimestamp(wednesday.toInstant().toEpochMilli());
    // 1d1h is older than the P1D creationTimeOffset
    a.setCreationTimestamp(wednesday.minusDays(1).minusHours(1).toInstant().toEpochMilli());
    assertFalse(filter.call(d, a).isPresent());
  }

  @Test
  public void testInvalidDuration() {
    val wednesday = ZonedDateTime.of(2022, 4, 6, 0, 0, 0, 0, ZoneOffset.UTC);

    String runId = UUID.randomUUID().toString();
    val predicate = new DigestApplicablePredicate(wednesday, runId);
    // In range
    assertFalse(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("invalid")
                        .datasetTimestampOffset("invalid")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
                .datasetTimestamp(wednesday.minusMinutes(1).toInstant().toEpochMilli())
                .build()));
  }

  @Test
  public void testFilter() {
    val monday = ZonedDateTime.of(2022, 4, 4, 0, 0, 0, 0, ZoneOffset.UTC);
    val tuesday = ZonedDateTime.of(2022, 4, 5, 0, 0, 0, 0, ZoneOffset.UTC);
    val wednesday = ZonedDateTime.of(2022, 4, 6, 0, 0, 0, 0, ZoneOffset.UTC);
    String runId = UUID.randomUUID().toString();

    val predicate = new DigestApplicablePredicate(wednesday, runId);
    // In range
    assertTrue(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("P1D")
                        .datasetTimestampOffset("P7D")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(wednesday.toInstant().toEpochMilli())
                .datasetTimestamp(wednesday.toInstant().toEpochMilli())
                .build()));

    assertTrue(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("P1D")
                        .datasetTimestampOffset("P7D")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(tuesday.toInstant().toEpochMilli())
                .datasetTimestamp(wednesday.minusDays(7).toInstant().toEpochMilli())
                .build()));

    assertTrue(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("P1D")
                        .datasetTimestampOffset("P7D")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(wednesday.toInstant().toEpochMilli())
                .datasetTimestamp(monday.toInstant().toEpochMilli())
                .build()));

    // Recently created, but data too old
    assertFalse(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("P1D")
                        .datasetTimestampOffset("P7D")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(tuesday.toInstant().toEpochMilli())
                .datasetTimestamp(monday.minusDays(8).toInstant().toEpochMilli())
                .build()));

    // Created too long ago
    assertFalse(
        predicate.test(
            Monitor.builder()
                .mode(
                    DigestMode.builder()
                        .creationTimeOffset("P1D")
                        .datasetTimestampOffset("P30D")
                        .build())
                .build(),
            AnalyzerResult.builder()
                .creationTimestamp(monday.toInstant().toEpochMilli())
                .datasetTimestamp(monday.toInstant().toEpochMilli())
                .build()));
  }
}

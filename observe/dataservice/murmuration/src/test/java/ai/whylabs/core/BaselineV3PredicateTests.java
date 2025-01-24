package ai.whylabs.core;

import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertTrue;

import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.Baselines.SingleBatchBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TimeRangeBaseline;
import ai.whylabs.core.configV3.structure.Baselines.TrailingWindowBaseline;
import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.predicatesV3.BaselineTimerangePredicateExplodedRowV3;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.ExplodedRow.ExplodedRowBuilder;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import lombok.val;
import org.testng.annotations.Test;

public class BaselineV3PredicateTests {

  @Test
  public void testTrailingWindow() {
    val targetBatchTs = ZonedDateTime.of(2021, 9, 25, 12, 0, 0, 0, ZoneOffset.UTC);
    TrailingWindowBaseline baseline = TrailingWindowBaseline.builder().size(12).build();
    BaselineTimerangePredicateExplodedRowV3 predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertFalse(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(12).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(13).toInstant().toEpochMilli()).build()));

    // make sure a trailing window of one day includes only a single batch
    baseline = TrailingWindowBaseline.builder().size(1).build();
    predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertFalse(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(2).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(3).toInstant().toEpochMilli()).build()));
  }

  @Test
  public void testTargetSize() {
    val targetBatchTs = ZonedDateTime.of(2021, 9, 25, 12, 0, 0, 0, ZoneOffset.UTC);
    val baseline = TrailingWindowBaseline.builder().size(12).build();
    BaselineTimerangePredicateExplodedRowV3 predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 2);
    assertFalse(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(2).toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(13).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(14).toInstant().toEpochMilli()).build()));
  }

  @Test
  public void testReferenceProfileId() {
    val targetBatchTs = ZonedDateTime.of(2021, 9, 25, 12, 0, 0, 0, ZoneOffset.UTC);
    val baseline = ReferenceProfileId.builder().profileId("blah").build();
    BaselineTimerangePredicateExplodedRowV3 predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertFalse(predicate.test(newBuilder().profileId("nope").build()));
    assertTrue(predicate.test(newBuilder().profileId("blah").build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(6).toInstant().toEpochMilli()).build()));
  }

  @Test
  public void testTimeRangeBaseline() {
    val targetBatchTs = ZonedDateTime.of(2021, 9, 25, 12, 0, 0, 0, ZoneOffset.UTC);
    val gte = ZonedDateTime.of(2021, 9, 1, 0, 0, 0, 0, ZoneOffset.UTC);
    val lt = ZonedDateTime.of(2021, 9, 3, 0, 0, 0, 0, ZoneOffset.UTC);

    val baseline =
        TimeRangeBaseline.builder()
            .range(
                TimeRange.builder()
                    .gte(gte.toInstant().toEpochMilli())
                    .lt(lt.toInstant().toEpochMilli())
                    .build())
            .build();
    BaselineTimerangePredicateExplodedRowV3 predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertTrue(predicate.test(newBuilder().ts(gte.toInstant().toEpochMilli()).build()));
    assertTrue(predicate.test(newBuilder().ts(gte.plusDays(1).toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(newBuilder().ts(lt.minusSeconds(1).toInstant().toEpochMilli()).build()));
    assertFalse(predicate.test(newBuilder().ts(lt.toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(5).toInstant().toEpochMilli()).build()));
  }

  @Test
  public void testSingleBatch() {
    val targetBatchTs = ZonedDateTime.of(2021, 9, 25, 12, 0, 0, 0, ZoneOffset.UTC);
    SingleBatchBaseline baseline;
    BaselineTimerangePredicateExplodedRowV3 predicate;

    // baseline is one day prior to target
    baseline = SingleBatchBaseline.builder().offset(1).build();
    predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertFalse(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(2).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(3).toInstant().toEpochMilli()).build()));

    // baseline is the two days prior to target
    baseline = SingleBatchBaseline.builder().offset(2).build();
    predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertFalse(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertTrue(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(2).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(3).toInstant().toEpochMilli()).build()));

    // baseline is the SAME as target (not expected to be useful)
    baseline = SingleBatchBaseline.builder().offset(0).build();
    predicate =
        new BaselineTimerangePredicateExplodedRowV3(
            targetBatchTs.toInstant().toEpochMilli(), Granularity.daily, 0, baseline, 1);
    assertTrue(predicate.test(newBuilder().ts(targetBatchTs.toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(1).toInstant().toEpochMilli()).build()));
    assertFalse(
        predicate.test(
            newBuilder().ts(targetBatchTs.minusDays(2).toInstant().toEpochMilli()).build()));
  }

  private ExplodedRowBuilder newBuilder() {
    return ExplodedRow.builder().orgId("org-0").datasetId("model-0");
  }
}

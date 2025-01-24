package ai.whylabs.core;

import static org.testng.AssertJUnit.assertFalse;
import static org.testng.AssertJUnit.assertTrue;

import ai.whylabs.core.configV3.structure.AnomalyFilter;
import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.predicatesV3.inclusion.AnomalyFilterPredicate;
import ai.whylabs.core.predicatesV3.inclusion.AnomalyFilterSirenDigestPredicate;
import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.Arrays;
import lombok.val;
import org.testng.annotations.Test;

public class AnomalyFilterTests {

  @Test
  public void testEmptyFilter() {
    val digest =
        Monitor.builder()
            .mode(DigestMode.builder().filter(AnomalyFilter.builder().build()).build())
            .build();
    val analyzerResult = AnalyzerResult.builder().build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));
  }

  @Test
  public void testIncludeColumnsFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(AnomalyFilter.builder().includeColumns(Arrays.asList("a")).build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("b").build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testExcludeColumnsFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(
                        AnomalyFilter.builder()
                            .includeColumns(Arrays.asList("a", "b"))
                            .excludeColumns(Arrays.asList("b"))
                            .build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("b").build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testMaxWeightFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(
                        AnomalyFilter.builder()
                            .maxWeight(.5d)
                            .excludeColumns(Arrays.asList("b"))
                            .build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").segmentWeight(.6).build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("a").segmentWeight(.4).build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testMinWeightWithNullFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(
                        AnomalyFilter.builder()
                            .minWeight(.5d)
                            .excludeColumns(Arrays.asList("b"))
                            .build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("a").segmentWeight(.6).build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testMaxWeightWithNullFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(
                        AnomalyFilter.builder()
                            .maxWeight(.5d)
                            .excludeColumns(Arrays.asList("b"))
                            .build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("a").segmentWeight(.3).build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testMetricsFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(AnomalyFilter.builder().includeMetrics(Arrays.asList("stddev")).build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().metric("stddev").segmentWeight(.6).build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 =
        AnalyzerResult.builder().column("a").metric("blah").segmentWeight(.4).build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testMinWeightFilter() {
    val digest =
        Monitor.builder()
            .mode(
                DigestMode.builder()
                    .filter(
                        AnomalyFilter.builder()
                            .minWeight(.5)
                            .excludeColumns(Arrays.asList("b"))
                            .build())
                    .build())
            .build();
    val analyzerResult = AnalyzerResult.builder().column("a").segmentWeight(.6).build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));

    val analyzerResult2 = AnalyzerResult.builder().column("a").segmentWeight(.4).build();
    assertFalse(new AnomalyFilterPredicate().test(digest, analyzerResult2));
  }

  @Test
  public void testNullFilter() {
    val digest = Monitor.builder().mode(DigestMode.builder().build()).build();
    val analyzerResult = AnalyzerResult.builder().build();
    assertTrue(new AnomalyFilterPredicate().test(digest, analyzerResult));
  }

  @Test
  public void testMaxTotalWeight() {
    val sirenPayload = SirenDigestPayload.builder().totalWeight(.5).build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertTrue(p.test(sirenPayload, null));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().build()));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxTotalWeight(.7).build()));
    assertFalse(p.test(sirenPayload, AnomalyFilter.builder().maxTotalWeight(.3).build()));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxTotalWeight(.5).build()));
  }

  @Test
  public void testMaxTotalWeightNull() {
    val sirenPayload = SirenDigestPayload.builder().build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertTrue(p.test(sirenPayload, null));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().build()));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxTotalWeight(.3).build()));
  }

  @Test
  public void testMinTotalWeight() {
    val sirenPayload = SirenDigestPayload.builder().totalWeight(.5).build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertFalse(p.test(sirenPayload, AnomalyFilter.builder().minTotalWeight(.7).build()));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().minTotalWeight(.4809).build()));
  }

  @Test
  public void testMinTotalWeightNull() {
    val sirenPayload = SirenDigestPayload.builder().build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxTotalWeight(.4809).build()));
  }

  @Test
  public void testMinAnomalies() {
    val sirenPayload = SirenDigestPayload.builder().numAnomalies(42l).build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().minAlertCount(40).build()));
    assertFalse(p.test(sirenPayload, AnomalyFilter.builder().minAlertCount(45).build()));
  }

  @Test
  public void testMaxAnomalies() {
    val sirenPayload = SirenDigestPayload.builder().numAnomalies(42l).build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertFalse(p.test(sirenPayload, AnomalyFilter.builder().maxAlertCount(40).build()));
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxAlertCount(45).build()));
  }

  @Test
  public void testMinAndMaxAnomalies() {
    val sirenPayload = SirenDigestPayload.builder().numAnomalies(38l).build();
    val p = new AnomalyFilterSirenDigestPredicate();
    assertTrue(p.test(sirenPayload, AnomalyFilter.builder().maxAlertCount(45).build()));
    assertFalse(p.test(sirenPayload, AnomalyFilter.builder().maxAlertCount(28).build()));
    assertTrue(
        p.test(sirenPayload, AnomalyFilter.builder().minAlertCount(30).maxAlertCount(40).build()));
    assertFalse(
        p.test(sirenPayload, AnomalyFilter.builder().minAlertCount(10).maxAlertCount(20).build()));
    assertFalse(
        p.test(sirenPayload, AnomalyFilter.builder().minAlertCount(40).maxAlertCount(50).build()));
  }
}

package ai.whylabs.core;

import static org.testng.Assert.assertNotNull;
import static org.testng.Assert.assertTrue;
import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.adhoc.AdHocAnalyzerRunnerV3;
import ai.whylabs.adhoc.resolvers.*;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import com.google.common.io.Resources;
import java.io.IOException;
import java.nio.charset.Charset;
import java.time.Month;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.SneakyThrows;
import lombok.val;
import org.joda.time.Interval;
import org.testng.annotations.Test;

public class AdHocV3Test {

  // TODO: Mock via Postgres so we can rip out remaining druid interfaces
  private class MockProfileRollupResolver implements DataResolverV3 {
    private String mockPayload;

    public MockProfileRollupResolver(String mockPayload) {
      this.mockPayload = mockPayload;
    }

    @Override
    public List<ExplodedRow> resolveStandardProfiles(AdHocMonitorRequestV3 request) {
      return DruidDataResolverV3.getExplodedRows(request, mockPayload);
    }

    @Override
    public List<ExplodedRow> resolveReferenceProfiles(AdHocMonitorRequestV3 request) {
      return Arrays.asList();
    }

    @Override
    public List<AnalyzerResultResponse> resolveAnalyzerResults(AdHocMonitorRequestV3 request) {
      return Collections.emptyList();
    }
  }

  @Test
  public void testAdhoc() throws IOException {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/adhocV3Request.json"), Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);

    String druidResponseJson =
        Resources.toString(
            Resources.getResource("adhoc/adhocDruidV3QueryResponse.json"),
            Charset.defaultCharset());

    val runner = new AdHocAnalyzerRunnerV3();
    val ret =
        runner.run(
            request,
            null,
            new MockProfileRollupResolver(druidResponseJson),
            UUID.randomUUID().toString(),
            false);
    assertEquals(ret.numEventsProduced, 100, 0);
    assertEquals(ret.numAnomalies, 75, 0);

    assertNotNull(ret.runId);
    assertTrue(ret.success);
  }

  @Test
  public void testRefProfileAdhoc() throws IOException {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/adhocRefProfileRequest.json"), Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);

    String druidResponseJson =
        Resources.toString(
            Resources.getResource("adhoc/adhocRefProfileBaselineResponse.json"),
            Charset.defaultCharset());

    val runner = new AdHocAnalyzerRunnerV3();
    val ret =
        runner.run(
            request,
            null,
            new MockProfileRollupResolver(druidResponseJson),
            UUID.randomUUID().toString(),
            false);
    assertEquals(ret.numEventsProduced, 14, 0);
    assertEquals(ret.numAnomalies, 0, 0);
    assertNotNull(ret.runId);
    assertTrue(ret.success);
  }

  @Test
  public void testAdhocFeatureWeights() throws IOException {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/adhocV3RequestWithFeatureWeights.json"),
            Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);

    String druidResponseJson =
        Resources.toString(
            Resources.getResource("adhoc/adhocNonSegmentedResponsePayload.json"),
            Charset.defaultCharset());

    val runner = new AdHocAnalyzerRunnerV3();
    val ret =
        runner.run(
            request,
            null,
            new MockProfileRollupResolver(druidResponseJson),
            UUID.randomUUID().toString(),
            false);

    val featuresWithWeightConfigsAboveTheMinWeight =
        Arrays.asList("verification_status_joint", "loan_status");
    assertEquals(ret.numEventsProduced, 58, 0.0);
    assertEquals(ret.numAnomalies, 58, 0.0);

    assertNotNull(ret.runId);
    assertTrue(ret.success);
  }

  @Test
  public void testAdhocWithTargetBucketLookback() throws IOException {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/adhocV3RequestWithTargetLooback.json"),
            Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);

    String druidResponseJson =
        Resources.toString(
            Resources.getResource("adhoc/adhocDruidV3QueryResponse.json"),
            Charset.defaultCharset());

    val runner = new AdHocAnalyzerRunnerV3();
    val ret =
        runner.run(
            request,
            null,
            new MockProfileRollupResolver(druidResponseJson),
            UUID.randomUUID().toString(),
            false);
    assertEquals(100, ret.numEventsProduced, 0.0);
    // With the extending the target buckets by 7 we have fewer anomalies than testAdhoc
    assertEquals(62, ret.numAnomalies, 0.0);
    assertNotNull(ret.runId);
    assertTrue(ret.success);
  }

  @SneakyThrows
  @Test
  public void testIntervalResolver() {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/orgZeroRequest.json"), Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);

    ZonedDateTime start = ZonedDateTime.of(2022, 10, 3, 0, 0, 0, 0, ZoneOffset.UTC);
    ZonedDateTime end = ZonedDateTime.of(2022, 11, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    val ranges = ResolverScopeCalculator.resolveIntervals(request, start, end);
    int c = 0;
    for (val r : ranges) {
      System.out.println(r.getStart());
      // One of them has 8D baseline
      assertEquals(25, r.getStart().getDayOfMonth());
      assertEquals(Month.SEPTEMBER, r.getStart().getMonth());
      c++;
    }
    assertEquals(1, c);
  }

  @SneakyThrows
  @Test
  public void testIntervalResolverTimeRange() {
    String json =
        Resources.toString(
            Resources.getResource("adhoc/orgZeroTimeRangeBaselineRequest.json"),
            Charset.defaultCharset());

    AdHocMonitorRequestV3 request = MonitorConfigV3JsonSerde.parseAdhocRequest(json);
    ZonedDateTime start = ZonedDateTime.of(2022, 10, 3, 0, 0, 0, 0, ZoneOffset.UTC);
    ZonedDateTime end = ZonedDateTime.of(2022, 11, 1, 0, 0, 0, 0, ZoneOffset.UTC);

    List<QueryTimeRange> queryRanges = new LinkedList<>();
    queryRanges.addAll(ResolverScopeCalculator.resolveIntervals(request, start, end));

    val first = queryRanges.get(0);

    // One of them has 8D baseline
    assertEquals(25, first.getStart().getDayOfMonth());
    assertEquals(Month.FEBRUARY, first.getStart().getMonth());
    assertEquals(Month.MARCH, first.getEnd().getMonth());

    assertEquals(queryRanges.get(1).getStart(), start);
    assertEquals(queryRanges.get(1).getEnd(), end);
    assertEquals(2, queryRanges.size());
  }

  @Test
  public void testIntervalCollapser() {
    val r = IntervalCollapser.merge(Arrays.asList(new Interval(1, 5), new Interval(2, 6)));
    assertEquals(r.size(), 1);
    assertEquals(r.get(0).getStartMillis(), 1);
    assertEquals(r.get(0).getEndMillis(), 6);

    val r2 =
        IntervalCollapser.merge(
            Arrays.asList(new Interval(1, 5), new Interval(10, 12), new Interval(10, 13)));
    assertEquals(r2.size(), 2);
    assertEquals(r2.get(0).getStartMillis(), 1);
    assertEquals(r2.get(0).getEndMillis(), 5);
    assertEquals(r2.get(1).getStartMillis(), 10);
    assertEquals(r2.get(1).getEndMillis(), 13);

    val r3 = IntervalCollapser.merge(Arrays.asList(new Interval(1, 5)));
    assertEquals(r3.size(), 1);
    assertEquals(r3.get(0).getStartMillis(), 1);
    assertEquals(r3.get(0).getEndMillis(), 5);
  }
}

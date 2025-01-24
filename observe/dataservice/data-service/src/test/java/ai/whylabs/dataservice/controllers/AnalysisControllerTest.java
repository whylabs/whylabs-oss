package ai.whylabs.dataservice.controllers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.GranularityInclusion;
import ai.whylabs.dataservice.requests.GetAlertCountsOverTimeSegmented;
import ai.whylabs.dataservice.requests.GetAnalyzerResultRequest;
import ai.whylabs.dataservice.responses.EvaluateTargetMatrixResponse;
import ai.whylabs.dataservice.responses.SegmentedGetAlertsOverTimeResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableList;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.hamcrest.core.Every;
import org.joda.time.Interval;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
class AnalysisControllerTest extends BasePostgresTest {

  @Inject private AnalysisController analysisController;
  @Inject private ObjectMapper objectMapper;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @Test
  // Disable until we can wire beans without aws resource access (so tests can run on
  // gitlab)
  void nonExistentOrg_shouldReturn_empty() {
    GetAnalyzerResultRequest req = new GetAnalyzerResultRequest();
    req.setOrgId("non-existent-org");
    req.setDatasetIds(ImmutableList.of());
    req.setAnalysisIds(ImmutableList.of());
    req.setInterval(Interval.parse("1970-07-12T22:46:53Z/P1D"));
    // TODO: a bit strange here that we don't/can't return 404 but empty results instead
    assertThat(analysisController.getAnalyzerResults(req), is(empty()));
  }

  @SneakyThrows
  @Test
  public void testTargetMatrixEvaluator() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(getClass().getResourceAsStream("EvaluateTargetMatrix.json")),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/analysis/targetMatrixEvaluator", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, EvaluateTargetMatrixResponse.class);
    log.info("Segments");
    for (val s : resp.getSegments()) {
      log.info(s);
    }
    assertEquals(3, resp.getSegments().size());
  }

  @Test
  public void queryMissingRunId() throws JsonProcessingException {
    String json =
        "{\"orgId\":\"org-3e8cGT\",\"datasetIds\":[\"model-10\"],\"columnNames\":[\"int-doublingnull\"],\"metrics\":[\"count_null_ratio\",\"count_null\"],\"segments\":[\"\"],\"runIds\":[\"1bef6b3c-b785-43a9-b056-3cbb4fc97c68\"],\"adhoc\":true,\"order\":\"desc\",\"interval\":\"2022-12-12T00:00:00.000Z/2022-12-18T23:59:59.999Z\",\"onlyAnomalies\":false,\"includeFailures\":false,\"limit\":10000}";
    val req = objectMapper.readValue(json, GetAnalyzerResultRequest.class);
    assertThat(analysisController.getAnalyzerResults(req), is(empty()));
  }

  @SneakyThrows
  @Test
  public void testAdhocMonotonic() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass()
                    .getResourceAsStream("/queries/AnalysisControllerTest_adhoc_target_size.json")),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);

    int alerts = 0;
    int nonAlerts = 0;
    for (val a : resp.events) {
      if (a.getAnomalyCount() > 0) {
        alerts++;
      } else {
        nonAlerts++;
      }
    }
    assertTrue(alerts > 0);
    assertTrue(nonAlerts > 0);
  }

  @SneakyThrows
  @Test
  public void testAdhoc() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/queries/AnalysisControllerTest_adhoc.json")),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);

    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest.setRunIds(Arrays.asList(resp.runId));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));

    // Should be nothing in the main table
    List<AnalyzerResultResponse> analyzerResults =
        analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertThat(analyzerResults.size(), is(0));

    // Now check the adhoc table
    getAnalyzerResultRequest.setAdhoc(true);
    analyzerResults = analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertThat(analyzerResults.size(), greaterThan(0));
    assertThat(analyzerResults.size(), is(resp.numEventsProduced));

    // assert none of the "mean" metrics are zero.
    val meanMetrics =
        analyzerResults.stream()
            .filter(r -> r.getAnalyzerId().equals("mean-fixed-threshold-analyzer"))
            .map(r -> r.getThreshold().getThreshold_metricValue())
            .collect(Collectors.toList());
    assertThat(meanMetrics, (Every.everyItem(greaterThan(0.0))));

    // These are normal rollup analyzers so asking for individual only should exclude everything
    getAnalyzerResultRequest.setGranularityInclusion(GranularityInclusion.INDIVIDUAL_ONLY);
    analyzerResults = analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertEquals(0, analyzerResults.size());

    // Rollup should come back with data
    getAnalyzerResultRequest.setGranularityInclusion(GranularityInclusion.ROLLUP_ONLY);
    analyzerResults = analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertThat(analyzerResults.size(), greaterThan(0));
    assertThat(analyzerResults.size(), is(resp.numEventsProduced));

    // Same deal, but let's query the wrong runId to make sure runId filtering works
    getAnalyzerResultRequest.setRunIds(Arrays.asList(UUID.randomUUID().toString()));
    assertThat(analysisController.getAnalyzerResults(getAnalyzerResultRequest).size(), is(0));

    // Query both a valid and invalid runid
    getAnalyzerResultRequest.setRunIds(Arrays.asList(UUID.randomUUID().toString(), resp.runId));
    analyzerResults = analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertThat(analyzerResults.size(), is(resp.numEventsProduced));

    // Only anomaly filter
    getAnalyzerResultRequest.setOnlyAnomalies(true);
    analyzerResults = analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    assertThat(analyzerResults.size(), lessThan(resp.numEventsProduced));

    // don't count the exact number of anomalies yet, as the number varies (speculation!) depending
    // on merge order of kll sketchs.
    //    assertThat(resp.numAnomalies, is(27));

    // No segmented alerts here, just getting some quick test coverage on this query
    val getAnalyzerResultRequestSegmented = new GetAlertCountsOverTimeSegmented();
    getAnalyzerResultRequestSegmented.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequestSegmented.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequestSegmented.setRunIds(Arrays.asList(resp.runId));
    getAnalyzerResultRequestSegmented.setGranularity(DataGranularity.daily);
    getAnalyzerResultRequestSegmented.setSegments(Arrays.asList("category=Baby Care"));
    getAnalyzerResultRequestSegmented.setInterval(
        Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));
    val postReq2 =
        HttpRequest.POST(
                "/analysis/getAlertCountsOverTimeSegmented",
                objectMapper.writeValueAsString(getAnalyzerResultRequestSegmented))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val segmentedResp = client.retrieve(postReq2, SegmentedGetAlertsOverTimeResponse.class);
    assertEquals(0, segmentedResp.getResults().size());
  }

  @SneakyThrows
  @Test
  public void testAdhocRefProfileTargetComparison() {
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass()
                    .getResourceAsStream(
                        "/queries/AnalysisControllerTest_adhocRefProfileTarget.json")),
            StandardCharsets.UTF_8);
    val client = httpClient.toBlocking();
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);
    assertEquals(2, resp.events.size());
    assertThat(
        resp.events.stream().map(AnalyzerResult::getAnalyzerId).collect(Collectors.toList()),
        containsInAnyOrder("histogram-drift-analyzer", "mean-fixed-threshold-analyzer"));
    for (val event : resp.events) {
      switch (event.getAnalyzerId()) {
        case "histogram-drift-analyzer":
          assertTrue(event.getDrift_metricValue() > 0.5376269865510235);
          assertTrue(event.getDrift_metricValue() < 0.5776269865510235);
          break;
        case "mean-fixed-threshold-analyzer":
          assertThat(event.getThreshold_metricValue(), closeTo(38.67427, 0.01));
          assertThat(event.getAnomalyCount(), is(1L));
          break;
      }
    }
  }
}

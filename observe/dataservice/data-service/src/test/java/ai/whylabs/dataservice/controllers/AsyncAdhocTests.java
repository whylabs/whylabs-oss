package ai.whylabs.dataservice.controllers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.adhoc.AsyncRequest;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.structures.PgMonitorSchedule;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.*;
import io.micronaut.http.annotation.Filter;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.filter.ClientFilterChain;
import io.micronaut.http.filter.HttpClientFilter;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.joda.time.Interval;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.reactivestreams.Publisher;

@Filter("/**") // avoid adding content_type headers to every request in this file.
class DefaultHeaderFilter implements HttpClientFilter {
  public Publisher<? extends HttpResponse<?>> doFilter(
      MutableHttpRequest<?> request, ClientFilterChain chain) {
    MutableHttpRequest<?> mutableRequest =
        request
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
            .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON);

    return chain.proceed(mutableRequest);
  }
}

@MicronautTest
@Slf4j
public class AsyncAdhocTests extends BasePostgresTest {

  @Inject private ObjectMapper objectMapper;

  @Inject
  @Client("/")
  HttpClient httpClient;

  private Long monitorConfigVersion = 41l;

  @BeforeAll
  public void copyTestData() {
    val client = httpClient.toBlocking();
    // the source model-61 is only populated over 2022-12-02T19:00:00Z/2022-12-09T19:00:00Z
    // so org-90210/model-61 is only populated over that interval after copying.
    String copyDataJson =
        "{\n"
            + "      \"sourceOrgId\": \"org-5Hsdjx\",\n"
            + "            \"sourceDatasetId\": \"model-61\",\n"
            + "            \"targetOrgId\": \"org-90210\",\n"
            + "            \"targetDatasetId\": \"model-61\",\n"
            + "            \"interval\": \"2020-05-06T23:50:13Z/2023-05-08T05:10:13Z\"\n"
            + "    }";
    client.exchange(HttpRequest.POST("/profiles/copy/false", copyDataJson));

    // Clear monitor schedules
    client.exchange(HttpRequest.DELETE("monitorScheduler/list/org-90210/model-61"));
  }

  @BeforeEach
  public void clearAnalysis() {
    val client = httpClient.toBlocking();
    String delJson = "{\"orgId\":\"org-90210\",\"datasetId\":\"model-61\"}";
    client.exchange(HttpRequest.POST("/analysis/deleteAnalysisRequests", delJson));

    // Force deletions to run now
    client.exchange(HttpRequest.POST("/analysis/deleteAnalysisRequests/runNow", "{}"));
  }

  @SneakyThrows
  private void writeMonitorConfig(String file) {
    val client = httpClient.toBlocking();
    String json = getResource(file);

    // Increment version to avoid stale cache hits
    monitorConfigVersion++;
    json = json.replace("41", monitorConfigVersion.toString());

    JsonNode rootNode = objectMapper.readTree(json);
    String orgId = rootNode.get("orgId").asText();
    String datasetId = rootNode.get("datasetId").asText();
    val row = MonitorConfigV3Row.builder().jsonConf(json).orgId(orgId).datasetId(datasetId).build();

    val postReq = HttpRequest.POST("/monitorConfig/save", objectMapper.writeValueAsString(row));
    client.exchange(postReq);
  }

  @SneakyThrows
  private void writeEntitySchema(String file) {
    val client = httpClient.toBlocking();

    String json = getResource(file);

    MonitorConfigV3 monitorConfig = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    EntitySchema schema = monitorConfig.getEntitySchema();
    val uri =
        "/entity/schema/"
            + monitorConfig.getOrgId()
            + "/"
            + monitorConfig.getDatasetId()
            + "/overwrite";
    client.exchange(HttpRequest.PUT(uri, objectMapper.writeValueAsString(schema)));
  }

  private String getResource(String rsrc) throws IOException {
    return IOUtils.toString(
        Objects.requireNonNull(getClass().getResourceAsStream(rsrc)), StandardCharsets.UTF_8);
  }

  @SneakyThrows
  @Test
  public void testOnDemandFlow() {
    val client = httpClient.toBlocking();
    writeMonitorConfig("/queries/monitorConfig1.json");
    writeEntitySchema("/queries/monitorConfig1.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-90210");
    getRequests.setDatasetId("model-61");

    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // Trigger async backfill
    val runId =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill", getResource("/queries/asyncBackfill.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runId, StatusEnum.SUCCESSFUL);

    // Did results get written to the primary table?
    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-90210");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest.setRunIds(Arrays.asList(runId));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));

    val results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)));

    val s = objectMapper.readTree(results).size();
    assertTrue(s > 0);

    // Validate task counters
    val status = client.retrieve(HttpRequest.GET("/analysisAsync/getStatus/" + runId));

    val a = objectMapper.readValue(status, AsyncRequest.class);
    assertEquals(a.getTasks(), a.getTasksComplete());
    assertTrue(a.getTasks() > 0);

    // Do it again and assert we got the same number of results (should be idempodent)
    val runId2 =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill", getResource("/queries/asyncBackfill.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runId2, StatusEnum.SUCCESSFUL);

    val results2 =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)));

    val s2 = objectMapper.readTree(results).size();
    assertEquals(s, s2);

    val statusComplete = client.retrieve(HttpRequest.GET("/analysisAsync/getStatus/" + runId));

    val req2 = objectMapper.readValue(status, AsyncRequest.class);
    assertEquals(req2.getTasksComplete(), req2.getTasks());
    assertEquals(req2.getStatus(), StatusEnum.SUCCESSFUL);

    // Run a single analyzer backfill on the same data
    val runIdSingle =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill",
                getResource("/queries/asyncBackxfillSingleAnalyzer.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runIdSingle, StatusEnum.SUCCESSFUL);

    getAnalyzerResultRequest.setRunIds(null);
    val results3 =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResultResponse[].class);

    Set<String> runIds = new HashSet<>();
    for (val a3 : results3) {
      if (a3.getAnalyzerId().equals("continuous-drift-analyzer")) {
        // verify group:continuous feature targeting
        assertEquals(runIdSingle, a3.getRunId());
        assertThat(a3.getColumn(), anyOf(is("market_price"), is("rating")));
      } else if (a3.getAnalyzerId().equals("discrete-drift-analyzer")) {
        // verify group:discrete feature targeting
        assertEquals(runId2, a3.getRunId());
        assertThat(
            a3.getColumn(),
            anyOf(is("sales_last_week"), is("date"), is("category"), is("predicted_rating")));
      } else {
        assertEquals(runId2, a3.getRunId());
      }
      runIds.add(a3.getRunId());
    }
    assertEquals(2, runIds.size());
  }

  @SneakyThrows
  @Test
  public void testScheduledFlow() {
    val client = httpClient.toBlocking();

    writeMonitorConfig("/queries/monitorConfig1.json");
    writeEntitySchema("/queries/monitorConfig1.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-90210");
    getRequests.setDatasetId("model-61");
    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // In order to make the unit test stable against a fixed dataset we need to rewind the schedule
    // to a target which exists in the dataset
    client.exchange(
        HttpRequest.POST(
            "monitorScheduler/rewindSchedule",
            objectMapper.writeValueAsString(
                RewindScheduleRequest.builder()
                    .orgId("org-90210")
                    .datasetId("model-61")
                    .timestamp("2022-12-03T00:00:00Z")
                    .build())));

    // Run Monitor scheduler to create async requests
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));

    val queryAsyncRequestsReq =
        HttpRequest.POST(
            "analysisAsync/query",
            "{\"orgId\":\"org-90210\",\"queue\":\"scheduled\",\"datasetId\":\"model-61\", \"onlyActive\":  true}");
    val requests = client.exchange(queryAsyncRequestsReq, AsyncRequest[].class);
    // there are 6 analyzers in monitorConfig1.json, expect 6 async requests
    assertEquals(6, requests.getBody().get().length);
    List<String> runIds = new ArrayList<>();
    for (val r : requests.getBody().get()) {
      assertEquals(StatusEnum.PENDING, r.getStatus());
      runIds.add(r.getRunId());
    }

    // Read back schedules to see if status changed
    PgMonitorSchedule[] schedules3 =
        objectMapper.readValue(
            client.retrieve(HttpRequest.GET("monitorScheduler/list/org-90210/model-61")),
            PgMonitorSchedule[].class);
    assertEquals(6, schedules3.length);
    for (val s : schedules3) {
      assertNotNull(s.getLastStatus());
    }

    // get total number of digests to compare after scheduling monitors
    val getDigestsRqst =
        GetDigestsRequest.builder().orgId("org-90210").datasetId("model-61").build();
    val beforeDigests =
        objectMapper.readValue(
            client.retrieve(
                HttpRequest.POST(
                    "/analysis/countDigests", objectMapper.writeValueAsString(getDigestsRqst))),
            Long.class);

    // Trigger query planner
    client.exchange(HttpRequest.GET("analysisAsync/triggerQueryPlanner"));

    // Wait for them all to finish
    for (val r : runIds) {
      pollForAdhocJobStatus(r, StatusEnum.SUCCESSFUL);
    }

    // Read back schedules to verify status changed and schedules advanced
    PgMonitorSchedule[] schedules4 =
        objectMapper.readValue(
            client.retrieve(HttpRequest.GET("monitorScheduler/list/org-90210/model-61")),
            PgMonitorSchedule[].class);
    for (val s : schedules4) {
      assertEquals(StatusEnum.SUCCESSFUL, s.getLastStatus());
      for (val schedulePrevious : schedules3) {
        if (schedulePrevious.getAnalyzerId().equals(s.getAnalyzerId())) {
          // assertTrue(s.getTargetBucket().isAfter(schedulePrevious.getTargetBucket()));
          // assertNotEquals(s.getInterval(), schedulePrevious.getInterval());
          assertEquals(s.getLastStatus(), StatusEnum.SUCCESSFUL);
          assertTrue(s.getLastUpdated().isAfter(schedulePrevious.getLastUpdated()));
        }
      }
    }

    // Verify analyzer results were written
    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-90210");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2022-12-01T00:00:00Z/2022-12-30T00:00:00Z"));
    val results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResult[].class);
    assertTrue(results.length > 0);

    val expectAnalyzerIds =
        Arrays.asList(
            "continuous-drift-analyzer",
            "discrete-drift-analyzer",
            "missing-values-ratio-analyzer-d317bs",
            "unique-estimate-ratio-analyzer-l0ypa9",
            "inferred-data-type-analyzer-acsmaf",
            "brave-springgreen-rat-9882-analyzer");
    Set<String> seenAnalyzerIds = new HashSet<>();
    for (val r : results) {
      seenAnalyzerIds.add(r.getAnalyzerId());
      assertTrue(r.getMonitorIds().size() > 0);
      // expect no anomalies
      assertThat(r.getAnomalyCount(), is(0L));
    }
    assertEquals(seenAnalyzerIds.size(), expectAnalyzerIds.size());

    var afterDigests =
        objectMapper.readValue(
            client.retrieve(
                HttpRequest.POST(
                    "/analysis/countDigests", objectMapper.writeValueAsString(getDigestsRqst))),
            Long.class);

    // since no anomalies, expect no digests
    assertThat("number of digests", (afterDigests - beforeDigests), is(0L));

    // Next run
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));

    // Verify that the target bucket advanced
    PgMonitorSchedule[] schedules5 =
        objectMapper.readValue(
            client.retrieve(HttpRequest.GET("monitorScheduler/list/org-90210/model-61")),
            PgMonitorSchedule[].class);
    for (val s : schedules5) {
      assertEquals(StatusEnum.PENDING, s.getLastStatus());
      for (val schedulePrevious : schedules3) {
        if (schedulePrevious.getAnalyzerId().equals(s.getAnalyzerId())) {
          assertTrue(s.getTargetBucket().isAfter(schedulePrevious.getTargetBucket()));
          assertNotEquals(s.getBackfillInterval(), schedulePrevious.getBackfillInterval());
        }
      }
    }
    // Trigger query planner
    client.exchange(HttpRequest.GET("analysisAsync/triggerQueryPlanner"));

    // Clean up
    val requests2 = client.exchange(queryAsyncRequestsReq, AsyncRequest[].class);
    for (val r : requests2.getBody().get()) {
      pollForAdhocJobStatus(r.getRunId(), StatusEnum.SUCCESSFUL);
    }
  }

  /**
   * missingDatapoint test does not use org-90210/model-61 created by copyTestData() above, 1)
   * because the test does not need a copy, and 2) the copy api does not populate the whylabs.tags
   * table. whylabs.tags is critical for the correct functioning of the missing_datapoint timeseries
   * metric.
   */
  @SneakyThrows
  @Test
  public void testMissingData() {
    val client = httpClient.toBlocking();

    writeEntitySchema("/queries/monitorConfigMissingData.json");
    writeMonitorConfig("/queries/monitorConfigMissingData.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-5Hsdjx");
    getRequests.setDatasetId("model-61");

    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // Trigger async backfill on missing column analyzer
    val runId =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill",
                getResource("/queries/asyncBackfillPgTargetMissingColumn.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runId, StatusEnum.SUCCESSFUL);

    // Validate column level
    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest.setRunIds(Arrays.asList(runId));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setColumnNames(Arrays.asList("sales_last_week"));
    getAnalyzerResultRequest.setAnalyzerIds(Arrays.asList("missing-datapoint-analyzer-column"));
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2020-01-01T00:00:00Z/2023-12-10T00:00:00Z"));

    val results3 =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)));

    int rows = 0;
    int anomalies = 0;
    int nonAnomalies = 0;
    for (val a3 : objectMapper.readTree(results3)) {
      assertEquals(a3.get("analyzerId").asText(), "missing-datapoint-analyzer-column");
      assertTrue(!StringUtils.isEmpty(a3.get(AnalyzerResult.Fields.column).asText()));
      rows++;
      if (a3.get("anomalyCount").asLong() == 1) {
        anomalies++;
      } else {
        nonAnomalies++;
      }
    }
    // populated 2022-12-02T19:00:00Z/2022-12-09T19:00:00Z
    //  backfill 2020-01-01T00:00:00.000Z/2020-01-03T23:59:59.999Z
    //
    // expect no missingDatapoint alerts because backfill interval predates uploaded data
    assertEquals(0, anomalies);
    assertEquals(0, nonAnomalies);

    val runIdWide =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill",
                getResource("/queries/asyncBackfillPgTargetMissingColumn2.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runIdWide, StatusEnum.SUCCESSFUL);

    getAnalyzerResultRequest.setRunIds(Arrays.asList(runIdWide));
    val results5 =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)));

    int segmented = 0;
    int overall = 0;
    val events = objectMapper.readTree(results5);
    for (JsonNode a3 : objectMapper.readTree(results5)) {
      assertEquals(a3.get("analyzerId").asText(), "missing-datapoint-analyzer-column");
      assertTrue(!StringUtils.isEmpty(a3.get(AnalyzerResult.Fields.column).asText()));
      // all datapoints outside the lineage are "missing"
      assertEquals(a3.get(AnalyzerResult.Fields.anomalyCount).asLong(), 1L);
      val segment = a3.get(AnalyzerResult.Fields.segment).asText();
      if (segment.isEmpty()) overall++;
      else {
        assertEquals(segment, "category=Baby Care");
        segmented++;
      }
    }
    //  populated 2022-12-02T19:00:00Z/2022-12-09T19:00:00Z
    //  backfill 2022-12-07T19:00:00Z/2022-12-12T19:00:00Z
    //
    // There are more missing profiles for the specific segment "category=Baby Care" than are
    // missing for the overall segment.
    assertEquals(5, segmented);
    assertEquals(3, overall);

    // Validate dataset level
    val runId2 =
        client.retrieve(
            HttpRequest.POST(
                "/analysisAsync/triggerBackfill",
                getResource("/queries/asyncBackfillPgTargetMissingDatasetLevel.json")));

    // Trigger query planner
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    pollForAdhocJobStatus(runId2, StatusEnum.SUCCESSFUL);

    val getAnalyzerResultRequest2 = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest2.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest2.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest2.setRunIds(Arrays.asList(runId2));
    getAnalyzerResultRequest2.setOnlyAnomalies(false);
    getAnalyzerResultRequest2.setIncludeFailures(true);
    getAnalyzerResultRequest2.setReadPgMonitor(true);
    getAnalyzerResultRequest2.setIncludeUnhelpful(true);
    getAnalyzerResultRequest2.setAnalyzerIds(Arrays.asList("missing-datapoint-analyzer-dataset"));
    getAnalyzerResultRequest2.setLimit(1000);
    getAnalyzerResultRequest2.setInterval(
        Interval.parse("2020-01-01T00:00:00Z/2023-12-10T00:00:00Z"));

    val results4 =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest2)));

    nonAnomalies = 0;
    anomalies = 0;
    for (val a : objectMapper.readTree(results4)) {
      if (a.get("anomalyCount").asLong() > 0) {
        anomalies++;
      } else {
        nonAnomalies++;
      }
    }
    // populated 2022-12-02T19:00:00Z/2022-12-09T19:00:00Z
    //  backfill 2022-12-07T19:00:00Z/2022-12-12T19:00:00Z
    //
    // expect 3 missingDatapoint alerts for the 3 days after end of profiles
    assertThat(nonAnomalies, is(0));
    assertThat(anomalies, is(3));
  }

  @SneakyThrows
  @Test
  public void testSecondsSinceLastUploadAlert() {
    val client = httpClient.toBlocking();

    writeMonitorConfig("/queries/monitorConfigSecondsSinceUpload.json");
    writeEntitySchema("/queries/monitorConfigSecondsSinceUpload.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-5Hsdjx");
    getRequests.setDatasetId("model-61");
    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // org-90210/model-61 is populated [2022-12-02/2022-12-09]. Rewind to 2022-12-12, which
    // will target 2022-12-11. Thus secondsSinceLastUpload should alert because it has been
    // more than a day since the last profile was expected.
    //
    // Keep in mind that profiles for this model were uploaded in 2024, so
    // `secondsSinceLastUpload` is negative across the lineage.  The only way to generate an
    // alert is to target a date outside the populated lineage.
    //
    client.exchange(
        HttpRequest.POST(
            "monitorScheduler/rewindSchedule",
            objectMapper.writeValueAsString(
                RewindScheduleRequest.builder()
                    .orgId("org-5Hsdjx")
                    .datasetId("model-61")
                    .timestamp("2022-12-12T00:00:00Z")
                    .build())));

    // Run Monitor scheduler to create async requests
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));

    val queryAsyncRequestsReq =
        HttpRequest.POST(
            "analysisAsync/query",
            "{\"orgId\":\"org-5Hsdjx\",\"queue\":\"scheduled\",\"datasetId\":\"model-61\", \"onlyActive\":  true}");
    val requests = client.exchange(queryAsyncRequestsReq, AsyncRequest[].class);
    assertEquals(1, requests.getBody().get().length);
    List<String> runIds = new ArrayList<>();
    for (val r : requests.getBody().get()) {
      assertEquals(StatusEnum.PENDING, r.getStatus());
      runIds.add(r.getRunId());
    }

    // Trigger query planner
    client.exchange(HttpRequest.GET("analysisAsync/triggerQueryPlanner"));

    // Wait for them all to finish
    for (val r : runIds) {
      pollForAdhocJobStatus(r, StatusEnum.SUCCESSFUL);
    }

    // Verify analyzer results were written
    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-61"));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setAnalyzerIds(Arrays.asList("missing_upload_analyzer"));
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2022-12-01T00:00:00Z/2022-12-30T00:00:00Z"));
    val results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResultResponse[].class);

    // profiles for this model were all uploaded in 2024.
    // That means `secondsSinceLastUpload` is negative across the lineage.

    assertThat(results.length, is(equalTo(1)));
    assertThat(results[0].getAnomalyCount(), is(0L));
    assertThat(results[0].getThreshold().getThreshold_metricValue().longValue(), is(-37869110L));
  }

  @SneakyThrows
  @Test
  public void testClassificationAnalyzers() {
    val client = httpClient.toBlocking();

    writeEntitySchema("/queries/monitorConfigClassification.json");
    writeMonitorConfig("/queries/monitorConfigClassification.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-5Hsdjx");
    getRequests.setDatasetId("model-60");
    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // org-5Hsdjx/model-60 is populated [2022-12-02/2022-12-09]. Rewind to 2022-12-03, which
    // will target 2022-12-02.
    //
    client.exchange(
        HttpRequest.POST(
            "monitorScheduler/rewindSchedule",
            objectMapper.writeValueAsString(
                RewindScheduleRequest.builder()
                    .orgId("org-5Hsdjx")
                    .datasetId("model-60")
                    .timestamp("2022-12-02T00:00:00Z")
                    .build())));

    // Run Monitor scheduler to create async requests
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));

    val queryAsyncRequestsReq =
        HttpRequest.POST(
            "analysisAsync/query",
            "{\"orgId\":\"org-5Hsdjx\",\"queue\":\"scheduled\",\"datasetId\":\"model-60\", \"onlyActive\":  true}");
    val requests = client.exchange(queryAsyncRequestsReq, AsyncRequest[].class);
    assertEquals(1, requests.getBody().get().length);
    List<String> runIds = new ArrayList<>();
    for (val r : requests.getBody().get()) {
      assertEquals(StatusEnum.PENDING, r.getStatus());
      runIds.add(r.getRunId());
    }

    // Trigger query planner
    client.exchange(HttpRequest.GET("analysisAsync/triggerQueryPlanner"));

    // Wait for them all to finish
    for (val r : runIds) {
      pollForAdhocJobStatus(r, StatusEnum.SUCCESSFUL);
    }

    // Verify analyzer results were written
    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-60"));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setAnalyzerIds(Arrays.asList("classification_precision_analyzer"));
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2022-12-01T00:00:00Z/2022-12-30T00:00:00Z"));
    val results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResultResponse[].class);

    //
    // Expect 5 results for specific segments and 1 for overall.
    //
    assertThat(results.length, is(equalTo(6)));
    int segmented = 0;
    int overall = 0;
    for (val a3 : results) {
      // assert all results target 2022-12-02T00:00:00Z (see monitorScheduler/rewindSchedule above)
      assertThat(a3.getDatasetTimestamp(), equalTo(1669939200000L));

      // analyzer targets overall segment and rating=*.
      val segment = a3.getSegment();
      if (segment.isEmpty()) overall++;
      else {
        assertThat(segment, startsWith("rating="));
        segmented++;
      }

      // verify that each reported anomaly is justified.
      if (a3.getAnomalyCount() > 0) {
        assertThat(
            a3.getThreshold().getThreshold_metricValue(),
            greaterThanOrEqualTo(a3.getThreshold().getThreshold_absoluteUpper()));
      } else {
        assertThat(
            a3.getThreshold().getThreshold_metricValue(),
            lessThan(a3.getThreshold().getThreshold_absoluteUpper()));
      }
    }
    assertEquals(segmented, 5);
    assertEquals(overall, 1);
  }

  /**
   * Test missing-datapoint alerts on a model containing only model metrics, in this case,
   * classification. Expect column-level analyzers to not work here because there are no columns to
   * assess, but dataset-level analyzers should work fine.
   *
   * <p>Note this method uses dynamically loaded profiles
   */
  @SneakyThrows
  @Test()
  public void testMissingDatapointModelOnly() {
    val client = httpClient.toBlocking();

    // org-5Hsdjx/model-77 contains only classification metrics - no column metrics at all.
    ingestProfile(
        "/profiles/classification-only/org-5Hsdjx-model-77-2023-03-01T030000-OEke67LoahGaUECcha8rI3JgbAW6anzv.bin");
    ingestProfile(
        "/profiles/classification-only/org-5Hsdjx-model-77-2023-03-01T150000-cuaey2j1CnARKrq4axEH1Rps7cQddOS7.bin");
    ingestProfile(
        "/profiles/classification-only/org-5Hsdjx-model-77-2023-03-02T030000-S32DMAPrwfRZ8d9eKq6HU0iP0VN9ZA4z.bin");
    ingestProfile(
        "/profiles/classification-only/org-5Hsdjx-model-77-2023-03-02T150000-BnwXBYITWbidCawxpdhGHgAWhnW3nQe9.bin");

    // missing-datapoint query depends on a consistent tags table.
    // force tags table rollup to capture recently ingested profiles.
    client.exchange(HttpRequest.POST("/profiles/forceTagTableRollup", "{}"));

    writeEntitySchema("/queries/testMissingDatapointModelOnly_monitorConfig.json");
    writeMonitorConfig("/queries/testMissingDatapointModelOnly_monitorConfig.json");

    // Saving monitor config triggers backfills which we wanna skip
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-5Hsdjx");
    getRequests.setDatasetId("model-77");
    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // org-5Hsdjx/model-77 is populated [2023-02-28/2023-03-02]. Rewind to 2023-03-05, which
    // will target 2023-03-04. Thus secondsSinceLastUpload should alert because it has been
    // more than a day since the last profile was expected.
    //
    client.exchange(
        HttpRequest.POST(
            "monitorScheduler/rewindSchedule",
            objectMapper.writeValueAsString(
                RewindScheduleRequest.builder()
                    .orgId("org-5Hsdjx")
                    .datasetId("model-77")
                    .timestamp("2023-03-04T00:00:00Z")
                    .build())));

    // Run Monitor scheduler to create async requests
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));

    val queryAsyncRequestsReq =
        HttpRequest.POST(
            "analysisAsync/query",
            "{\"orgId\":\"org-5Hsdjx\",\"queue\":\"scheduled\",\"datasetId\":\"model-77\", \"onlyActive\":  true}");
    val requests = client.exchange(queryAsyncRequestsReq, AsyncRequest[].class);

    // monitorConfigMissingDatapointModelOnly has two analyzers, so expect two scheduled analyzer
    // requests.
    assertEquals(2, requests.getBody().get().length);
    List<String> runIds = new ArrayList<>();
    for (val r : requests.getBody().get()) {
      assertEquals(StatusEnum.PENDING, r.getStatus());
      runIds.add(r.getRunId());
    }

    // get total number of digests to compare after scheduling monitors
    val getDigestsRqst =
        GetDigestsRequest.builder().orgId("org-5Hsdjx").datasetId("model-77").build();
    val beforeDigests =
        objectMapper.readValue(
            client.retrieve(
                HttpRequest.POST(
                    "/analysis/countDigests", objectMapper.writeValueAsString(getDigestsRqst))),
            Long.class);

    // Trigger query planner
    client.exchange(HttpRequest.GET("analysisAsync/triggerQueryPlanner"));

    // Wait for them all to finish
    for (val r : runIds) {
      pollForAdhocJobStatus(r, StatusEnum.SUCCESSFUL);
    }

    // Verify analyzer results were written
    GetAnalyzerResultRequest getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-5Hsdjx");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-77"));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setReadPgMonitor(true);
    getAnalyzerResultRequest.setAnalyzerIds(Arrays.asList("missing-datapoint-dataset-analyzer"));
    getAnalyzerResultRequest.setLimit(1000);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2023-03-01T00:00:00Z/2023-03-05T00:00:00Z"));
    AnalyzerResultResponse[] results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResultResponse[].class);

    // expect an anomaly at timestamp 2023-03-04T00:00:00Z
    // note if no anomalies are generated, check that model-77 profiles were ingested.
    // missing-datapoint are suppressed if a model has no profiles at all.
    assertThat(results.length, is(equalTo(1)));
    assertThat(results[0].getAnomalyCount(), is(1L));
    assertThat(results[0].getDatasetTimestamp(), is(1677888000000L));

    // compare number of digests generated after monitors ran
    var afterDigests =
        objectMapper.readValue(
            client.retrieve(
                HttpRequest.POST(
                    "/analysis/countDigests", objectMapper.writeValueAsString(getDigestsRqst))),
            Long.class);

    // expect to create a notification digest for each analyzer
    assertThat("number of digests", (afterDigests - beforeDigests), is(1L));

    // expect no anomalies for the column analyzer.  There are no columns in this model!
    getAnalyzerResultRequest.setAnalyzerIds(Arrays.asList("missing-datapoint-column-analyzer"));
    results =
        client.retrieve(
            HttpRequest.POST(
                "/analysis/getAnalyzerResults",
                objectMapper.writeValueAsString(getAnalyzerResultRequest)),
            AnalyzerResultResponse[].class);
    // this isn't a great assertion because there are other reasons that missing-datapoint
    // might be suppressed, other than applying a column-level analyzer to a model-metric-only
    // model.
    assertThat(results.length, is(equalTo(0)));
  }

  @SneakyThrows
  @Test
  public void testPartialTargets() {
    val client = httpClient.toBlocking();
    writeMonitorConfig("/queries/monitorConfigFullTarget.json");
    PgMonitorSchedule[] schedules1 =
        objectMapper.readValue(
            client.retrieve(HttpRequest.GET("monitorScheduler/list/org-0/model-2370")),
            PgMonitorSchedule[].class);

    client.exchange(
        HttpRequest.POST(
            "monitorScheduler/rewindSchedule",
            objectMapper.writeValueAsString(
                RewindScheduleRequest.builder()
                    .orgId("org-0")
                    .datasetId("model-2370")
                    .timestamp("2024-10-01T00:00:00Z")
                    .build())));

    cancelAllAsyncRequests("org-0", "model-2370");

    // Ingest a profile to get entity schema populated
    ingestProfile(
        "/profiles/org-0-model-2370-2024-10-29T140513.043-O9uTpB0OjPTrIgNdYX72Q8Y7fPmFHwC3.bin");

    // Wait for entity schema async
    EntitySchema schema = null;
    while (true) {
      schema = getEntitySchema("org-0", "model-2370");
      if (schema != null) {
        break;
      }
    }
    // Ingest a profile with partial target batches disabled, being scheduled work no backfills
    // should be created
    ingestProfile(
        "/profiles/org-0-model-2370-2024-10-29T140513.043-O9uTpB0OjPTrIgNdYX72Q8Y7fPmFHwCH.bin");

    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId("org-0");
    getRequests.setDatasetId("model-2370");
    val reqs2 =
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class);

    for (val r : reqs2) {
      assertNotEquals(AsyncAnalysisQueue.scheduled, r.getQueue());
      assertEquals(StatusEnum.CANCELED, r.getStatus());
    }

    // Enable partial target batches
    writeMonitorConfig("/queries/monitorConfigPartialTarget.json");

    cancelAllAsyncRequests("org-0", "model-2370");

    // Ingest another one (same timestamp)
    ingestProfile(
        "/profiles/org-0-model-2370-2024-10-29T140513.043-O9uTpB0OjPTrIgNdYX72Q8Y7fPmFHwC2.bin");

    client.exchange(
        HttpRequest.POST("/profiles/forcePromote/individual/org-0/model-2370", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    triggerColumnStatRollups();

    // Run Monitor
    client.exchange(HttpRequest.POST("monitorScheduler/forceRun", "{}"));
    client.exchange(HttpRequest.GET("/analysisAsync/triggerQueryPlanner"));

    val reqs =
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class);
    assertEquals(reqs.length, 2);
    for (val r : reqs) {
      if (!r.getQueue().equals(AsyncAnalysisQueue.scheduled)) {
        continue;
      }
      assertNotNull(r.getAnalyzerType());
      assertNotNull(r.getMonitorId());
      assertTrue(r.getAnomalies() != null);

      pollForAdhocJobStatus(r.getRunId(), StatusEnum.SUCCESSFUL);
      val runId = r.getRunId();

      // Verify analyzer results were written
      val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
      getAnalyzerResultRequest.setOrgId("org-0");
      getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-2370"));
      getAnalyzerResultRequest.setOnlyAnomalies(false);
      getAnalyzerResultRequest.setIncludeFailures(true);
      getAnalyzerResultRequest.setIncludeUnhelpful(true);
      getAnalyzerResultRequest.setReadPgMonitor(true);
      getAnalyzerResultRequest.setRunIds(Arrays.asList(runId));
      getAnalyzerResultRequest.setLimit(1000);
      getAnalyzerResultRequest.setInterval(
          Interval.parse("2024-09-01T00:00:00Z/2024-12-30T00:00:00Z"));
      val results =
          client.retrieve(
              HttpRequest.POST(
                  "/analysis/getAnalyzerResults",
                  objectMapper.writeValueAsString(getAnalyzerResultRequest)),
              AnalyzerResultResponse[].class);
      assertTrue(results.length > 1);
      for (val r2 : results) {
        assertEquals(runId, r2.getRunId());
      }
    }

    // Validate the schedule advanced after the partial target bucket triggered
    PgMonitorSchedule[] schedules4 =
        objectMapper.readValue(
            client.retrieve(HttpRequest.GET("monitorScheduler/list/org-0/model-2370")),
            PgMonitorSchedule[].class);
    for (val s : schedules4) {
      assertEquals("2024-11-01T00:00:00.000Z/2024-12-01T00:00:00.000Z", s.getBackfillInterval());
    }
  }

  @SneakyThrows
  private EntitySchema getEntitySchema(String orgId, String datasetId) {
    val client = httpClient.toBlocking();
    val g = new GetEntitySchemaRequest();
    g.setOrgId(orgId);
    g.setDatasetId(datasetId);
    g.setIncludeHidden(false);

    // Read it back
    val r =
        client.exchange(
            HttpRequest.POST("/entity/schema/retrieve", objectMapper.writeValueAsString(g))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            EntitySchema.class);
    return r.body();
  }

  @SneakyThrows
  private void cancelAllAsyncRequests(String orgId, String datasetId) {
    val client = httpClient.toBlocking();
    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId(orgId);
    getRequests.setDatasetId(datasetId);

    for (val a :
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class)) {

      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + a.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }
  }

  // Between a subset of columns arriving late, model metrics coming in before or after the
  // columns, it’d be good to verify that we’ve got our bases covered auto-triggering
  // backfills irregardless of how weird the integration pattern is.

  // ingest part of a model that has only some of the column
  // add a monitor config
  // verify that the monitor gets triggered.
  // ingest some more columns.
  // do the new columns get backfilled?

  @SneakyThrows
  @Test
  public void testStaggeredArrivals() {
    // ingest part of a model that has only some of the column
    // add a monitor config
    // verify that the monitor gets triggered.
    // ingest some more columns.
    // do the new columns get backfilled?

    val client = httpClient.toBlocking();
    val orgId = "org-staggered";
    val datasetId = "model-77";
    ingestProfile("/profiles/testStaggeredArrivals/staggered-model-77-2023-03-01-dataset-only.bin");

    val getRequests = new GetAsyncRequests();
    getRequests.setOrgId(orgId);
    getRequests.setDatasetId(datasetId);

    AsyncRequest[] requests =
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class);

    assertThat(requests, emptyArray());

    writeMonitorConfig("/queries/monitorConfigStaggeredArrival.json");

    requests =
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class);

    // two analyzers in monitor config, generates two async requests
    assertThat(requests, arrayWithSize(2));

    // cancel the requests before making some more
    for (val r : requests) {
      client.exchange(
          HttpRequest.DELETE(
              "/analysisAsync/triggerAnalysis/cancel/" + r.getRunId(),
              objectMapper.writeValueAsString(getRequests)));
    }

    // ingest column data.
    // has columns for market_price, sales_last_week, category, product, rating, output_prediction,
    // output_discount
    ingestProfile("/profiles/testStaggeredArrivals/staggered-model-77-2023-03-01-with-columns.bin");

    client.exchange(
        HttpRequest.POST("/profiles/forcePromote/individual/org-staggered/model-77", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    triggerColumnStatRollups();

    requests =
        client.retrieve(
            HttpRequest.POST("/analysisAsync/query", objectMapper.writeValueAsString(getRequests)),
            AsyncRequest[].class);

    // expect 4 total requests, 2 PENDING and 2 CANCELLED
    assertThat(requests, arrayWithSize(4));
    // expect 2 PENDING requests, one for overall segment and another for "category=Beverages"
    val pending =
        Arrays.stream(requests)
            .filter(r -> r.getStatus() == StatusEnum.PENDING)
            .collect(Collectors.toList());
    assertThat(pending.size(), is(2));
    // expect PENDING requests to cover all the new columns.
    pending.forEach(
        r ->
            assertThat(
                r.getColumns(),
                containsInAnyOrder(
                    "market_price",
                    "sales_last_week",
                    "category",
                    "product",
                    "rating",
                    "output_prediction",
                    "output_discount")));
    // expect PENDING intervals to backfill newly ingested profile timestamp
    pending.forEach(
        r ->
            assertThat(
                r.getBackfillInterval(), is("2023-03-01T00:00:00.000Z/2023-03-02T00:00:00.000Z")));
  }
}

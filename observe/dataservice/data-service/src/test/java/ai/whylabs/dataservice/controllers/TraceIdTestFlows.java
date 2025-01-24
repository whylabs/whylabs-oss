package ai.whylabs.dataservice.controllers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.GranularityInclusion;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.GetAlertsOverTimeResponse;
import ai.whylabs.dataservice.responses.ModelRollup;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableList;
import com.google.gson.JsonParser;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.joda.time.Interval;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

@MicronautTest
@Slf4j
class TraceIdTestFlows extends BasePostgresTest {

  @Inject
  @Client("/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;
  @Inject private AnalysisController analysisController;

  @Test
  void testRollupWithTraceId() throws IOException {
    String traceId = "test";

    val profilesReq =
        ProfileRollupRequest.builder()
            .orgId("org-5Hsdjx")
            .datasetId("model-60")
            .segment(ImmutableList.of(SegmentTag.builder().key("rating").value("1").build()))
            .columnNames(ImmutableList.of("date"))
            .interval(Interval.parse("2022-12-01T00:00:00Z/2022-12-10T00:00:00Z"))
            .granularity(DataGranularity.daily)
            .build();
    val res = runRollup(profilesReq);
    assertThat(res.size(), is(8));

    val client = httpClient.toBlocking();

    // Populate a trace id on every row in the table
    client.exchange(
        HttpRequest.PUT("profiles/traceId/populate/org-5Hsdjx/model-60/test", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
    client.exchange(
        HttpRequest.PUT("profiles/traceId/populate/org-5Hsdjx/model-61/test", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Assert filter by traceId works
    profilesReq.setTraceId("invalidTraceId");
    val res2 = runRollup(profilesReq);
    assertThat(res2.size(), is(0));

    profilesReq.setTraceId(traceId);
    String json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", objectMapper.writeValueAsString(profilesReq))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    // Rollup queries should include the traceId aggregated

    int c = 0;
    for (val ja : new JsonParser().parse(json).getAsJsonArray()) {
      for (val feature : ja.getAsJsonObject().get("features").getAsJsonObject().entrySet()) {
        assertEquals(
            traceId,
            feature
                .getValue()
                .getAsJsonObject()
                .get("type_string")
                .getAsJsonObject()
                .get("whylabs/traceid")
                .getAsString());
        c++;
      }
    }

    // Run adhoc monitor, make sure traceId made its way onto the analyzer result
    String adhocJson =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/queries/adhocAnomalyGeneratorInline.json")),
            StandardCharsets.UTF_8);
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", adhocJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);
    for (val r : resp.events) {
      if (r.getTargetLevel().equals(TargetLevel.column)) {
        assertTrue(r.getTraceIds().contains(traceId));
        assertFalse(r.getDisableTargetRollup());
      }
    }

    assertTrue(c > 0);
  }

  private List<Long> runRollup(ProfileRollupRequest req) throws JsonProcessingException {
    val client = httpClient.toBlocking();

    String json =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", objectMapper.writeValueAsString(req))
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    log.info("Recieved {}", json);
    List<Long> timestamps = new ArrayList<>();
    for (val o : objectMapper.readTree(json)) {
      if (!o.has(ModelRollup.Fields.timestamp)) {
        continue;
      }
      timestamps.add(o.get(ModelRollup.Fields.timestamp).asLong());
    }
    return timestamps;
  }

  @SneakyThrows
  @Test
  public void testAdhocIndividualGranularity() {
    val client = httpClient.toBlocking();

    // Set up org-0 for granular storage
    String writeOrgJson =
        "{\"orgId\":\"org-0\",\"dataRetentionDays\":365,\"enableGranularDataStorage\": true}";
    client.exchange(
        HttpRequest.POST("/org/save", writeOrgJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Ingest a profile with traceId populated
    ingestProfile(
        "/profiles/org-0-model-2240-2023-09-07T215543.309-GkfWbBVPdWMQrLLEPvXxvQOOo8qoq5iB.bin");

    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/queries/adhocIndividualGranularity.json")),
            StandardCharsets.UTF_8);
    // Run adhoc
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);
    Assertions.assertEquals(1, resp.events.size());
    for (val r : resp.events) {
      // Notable that the timestamp on this data is Thu Sep 07 2023 21:55:43 GMT+0000 and the
      // analyzer results produced match that timestamp because its on individual granularity
      assertEquals(Optional.of(1694123743309l), Optional.of(r.getDatasetTimestamp()));
      assertTrue(r.getTraceIds().contains("147308a3-4ac0-4580-8d5e-85404b2a0c3d"));
      assertTrue(r.getDisableTargetRollup());
    }

    // Do it again, but this time persist the results so we can validate our filters
    json = json.replace("\"inlineResults\": true", "\"inlineResults\": false");
    val re =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp2 = client.retrieve(re, AdHocMonitorResponse.class);

    val getAnalyzerResultRequest = new GetAnalyzerResultRequest();
    getAnalyzerResultRequest.setOrgId("org-0");
    getAnalyzerResultRequest.setDatasetIds(Arrays.asList("model-2240"));
    getAnalyzerResultRequest.setRunIds(Arrays.asList(resp2.runId));
    getAnalyzerResultRequest.setOnlyAnomalies(false);
    getAnalyzerResultRequest.setIncludeFailures(true);
    getAnalyzerResultRequest.setIncludeUnhelpful(true);
    getAnalyzerResultRequest.setAdhoc(true);
    getAnalyzerResultRequest.setInterval(
        Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));

    List<AnalyzerResultResponse> analyzerResults =
        analysisController.getAnalyzerResults(getAnalyzerResultRequest);
    for (val a : analyzerResults) {
      assertTrue(a.getDisableTargetRollup());
    }

    val getAnalyzerResultRequest2 = new GetAlertsOverTimeRequest();
    getAnalyzerResultRequest2.setOrgId("org-0");
    getAnalyzerResultRequest2.setDatasetIds(Arrays.asList("model-2240"));
    getAnalyzerResultRequest2.setRunIds(Arrays.asList(resp2.runId));
    getAnalyzerResultRequest2.setGranularity(DataGranularity.daily);
    getAnalyzerResultRequest2.setAdhoc(true);
    getAnalyzerResultRequest2.setGranularityInclusion(GranularityInclusion.BOTH);
    getAnalyzerResultRequest2.setInterval(
        Interval.parse("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));

    // Both
    val postReq2 =
        HttpRequest.POST(
                "/analysis/getAlertCountsOverTime",
                objectMapper.writeValueAsString(getAnalyzerResultRequest2))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp3 = client.retrieve(postReq2, GetAlertsOverTimeResponse[].class);
    Assertions.assertEquals(1, resp3.length);

    // Granularity Individual
    getAnalyzerResultRequest2.setGranularityInclusion(GranularityInclusion.INDIVIDUAL_ONLY);
    Assertions.assertEquals(
        1,
        client.retrieve(
                HttpRequest.POST(
                        "/analysis/getAlertCountsOverTime",
                        objectMapper.writeValueAsString(getAnalyzerResultRequest2))
                    .contentType(MediaType.APPLICATION_JSON_TYPE)
                    .accept(MediaType.APPLICATION_JSON),
                GetAlertsOverTimeResponse[].class)
            .length);

    // Granularity Rollup
    getAnalyzerResultRequest2.setGranularityInclusion(GranularityInclusion.ROLLUP_ONLY);
    Assertions.assertEquals(
        0,
        client.retrieve(
                HttpRequest.POST(
                        "/analysis/getAlertCountsOverTime",
                        objectMapper.writeValueAsString(getAnalyzerResultRequest2))
                    .contentType(MediaType.APPLICATION_JSON_TYPE)
                    .accept(MediaType.APPLICATION_JSON),
                GetAlertsOverTimeResponse[].class)
            .length);

    GetAnomalyCountsRequest request = new GetAnomalyCountsRequest();
    request.setOrgId("org-0");
    request.setDatasetIds(Arrays.asList("model-2240"));
    request.setInterval(new Interval("2020-12-01T00:00:00Z/2023-12-10T00:00:00Z"));

    // Anomaly count api (individual granularity)
    String alertCounts =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"orgId\":\"org-0\",\"datasetIds\":[\"model-2240\"],\"granularityInclusion\":\"INDIVIDUAL_ONLY\",\"adhoc\":true,\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"image.Saturation.stddev\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    // Anomaly count api (both granularity)
    String alertCounts2 =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"orgId\":\"org-0\",\"datasetIds\":[\"model-2240\"],\"granularityInclusion\":\"BOTH\",\"adhoc\":true,\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"image.Saturation.stddev\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals(
        1,
        new JsonParser()
            .parse(alertCounts2)
            .getAsJsonArray()
            .get(0)
            .getAsJsonObject()
            .get("anomalies")
            .getAsLong());

    // Anomaly count api (rollup granularity)
    String alertCounts3 =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"orgId\":\"org-0\",\"datasetIds\":[\"model-2240\"],\"granularityInclusion\":\"ROLLUP_ONLY\", \"adhoc\":true,\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"image.Saturation.stddev\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(0, new JsonParser().parse(alertCounts3).getAsJsonArray().size());
  }
}

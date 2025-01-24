package ai.whylabs.dataservice.controllers;

import static org.junit.Assert.*;

import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.models.MonitorAndAnomalyCount;
import ai.whylabs.dataservice.responses.DataDeletionPreviewResponse;
import ai.whylabs.dataservice.responses.DeletionReport;
import ai.whylabs.dataservice.streaming.AuditRow;
import ai.whylabs.ingestion.payloads.ProfileReadRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.Optional;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;

@MicronautTest()
@Slf4j
public class DeletionFlowTests extends BasePostgresTest {
  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @Inject private ObjectMapper objectMapper;

  @SneakyThrows
  @Test
  public void testProfileDeletionFlow() {
    val client = httpClient.toBlocking();

    // Copy some data into a sandbox org so deleting it doesn't interfere with other orgs
    String copyDataJson =
        "{\n"
            + "      \"sourceOrgId\": \"org-5Hsdjx\",\n"
            + "            \"sourceDatasetId\": \"model-61\",\n"
            + "            \"targetOrgId\": \"org-11\",\n"
            + "            \"targetDatasetId\": \"model-61\",\n"
            + "            \"interval\": \"2020-05-06T23:50:13Z/2023-05-08T05:10:13Z\"\n"
            + "    }";
    client.exchange(
        HttpRequest.POST("/profiles/copy/false", copyDataJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Delete Preview
    String delJson = "{\"orgId\":\"org-11\",\"datasetId\":\"model-61\"}";
    DataDeletionPreviewResponse preview =
        client.retrieve(
            HttpRequest.POST("/profiles/deleteProfileRequests/preview", delJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertTrue(preview.getNumRows() > 0); // Yup, there's stuff to delete

    // Queue up deletion
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests", delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // See what's queued up for deletion
    String j =
        client.retrieve(
            HttpRequest.GET("/profiles/deleteProfileRequests/" + "org-11")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    String id = objectMapper.readTree(j).get(0).get("id").asText();

    // Cancel it
    client.exchange(
        HttpRequest.PUT("/profiles/deleteProfileRequests/cancel/" + id, delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Assert that wiped the queue
    val enqueuedRequests =
        client.retrieve(
            HttpRequest.GET("/profiles/deleteProfileRequests/" + "org-11")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("CANCELED", objectMapper.readTree(enqueuedRequests).get(0).get("status").asText());

    // Cool, ok lets queue it up again
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests", delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Force deletions to run now
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests/runNow", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Data should be toast, deletion preview should show nothing would be deleted if you re-ran the
    // deletion request
    preview =
        client.retrieve(
            HttpRequest.POST("/profiles/deleteProfileRequests/preview", delJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertEquals(0, preview.getNumRows(), 0); // Nothing to delete, the deletion task worked

    // Request should show up as completed
    String recentRequests =
        client.retrieve(
            HttpRequest.GET("/profiles/deleteProfileRequests/" + "org-11")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("COMPLETED", objectMapper.readTree(recentRequests).get(0).get("status").asText());

    // Force another deletion run (with nothing queued up)
    DeletionReport r =
        client.retrieve(
            HttpRequest.POST("/profiles/deleteProfileRequests/runNow", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DeletionReport.class);

    // Make sure it didn't double execute a deletion request
    /*
        assertEquals(0, r.getDeletionRequestsRan());
        val timeseriesReq = new TimeSeriesProfileRequest();
        timeseriesReq.setOrgId("org-5Hsdjx");
        timeseriesReq.setDatasetIds(Arrays.asList("model-61"));

        TimeSeriesProfileResponse ts =
                client.retrieve(
                        HttpRequest.POST("/profiles/timeseries/", objectMapper.writeValueAsString(timeseriesReq))
                                .contentType(MediaType.APPLICATION_JSON_TYPE)
                                .accept(MediaType.APPLICATION_JSON), TimeSeriesProfileResponse.class);

    */

  }

  @SneakyThrows
  @Test
  void testReingestIngestProfile() {
    ingestProfile(
        "/profiles/testReingestIngestProfile/org-gLf28d-model-1-2024-09-01T000000-nvyLbXnWf2Yzdy4ysrm9TC2TpxkGescQ.bin");

    val client = httpClient.toBlocking();
    client.exchange(
        HttpRequest.POST("/profiles/forceTagTableRollup", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    String rollupRqst =
        "{"
            + "  \"orgId\": \"org-gLf28d\","
            + "  \"datasetId\": \"model-1\","
            + "  \"interval\": \"2024-09-01/P90D\""
            + "}";

    val ret =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", rollupRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertNotEquals("[]", ret);

    String delJson =
        "{\"orgId\":\"org-gLf28d\",\"datasetId\":\"model-1\", \"reingestAfterDeletion\":true}";

    // Queue up deletion, but with reingestAfterDeletion=true
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests", delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Force deletions to run now
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests/runNow", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Ingest pending profiles
    client.exchange(
        HttpRequest.POST("/profiles/ingestPending", "{\"count\":100}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.TEXT_PLAIN));

    // Poll for the reingestion to finish
    val req = new ProfileReadRequest();
    req.setFile(
        readResource(
                "/profiles/testReingestIngestProfile/org-gLf28d-model-1-2024-09-01T000000-nvyLbXnWf2Yzdy4ysrm9TC2TpxkGescQ.bin")
            .toString());
    String body = objectMapper.writeValueAsString(req);
    for (int x = 0; x < 10; x++) {
      String stateReply =
          client.retrieve(
              HttpRequest.POST("/profiles/getIngestState", body)
                  .contentType(MediaType.APPLICATION_JSON_TYPE)
                  .accept(MediaType.APPLICATION_JSON));
      val response = objectMapper.readTree(stateReply).asText();
      val current = AuditRow.IngestState.valueOf(response);
      if (current.equals(AuditRow.IngestState.ingested)) {
        break;
      } else {
        Thread.sleep(1000);
      }
    }

    val ret2 =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", rollupRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertNotEquals("[]", ret2);

    // Make sure reingestAfterDeletion=false doesn't reingest
    String delJson2 =
        "{\"orgId\":\"org-gLf28d\",\"datasetId\":\"model-1\", \"reingestAfterDeletion\":false}";

    // Queue up deletion
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests", delJson2)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Force deletions to run now without reingestion
    client.exchange(
        HttpRequest.POST("/profiles/deleteProfileRequests/runNow", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    val ret3 =
        client.retrieve(
            HttpRequest.PUT("/profiles/profileRollup", rollupRqst)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("[]", ret3);
  }

  @Test
  public void testSingleColumnDeletion() {
    val client = httpClient.toBlocking();

    // Copy some data into a sandbox org so deleting it doesn't interfere with other orgs

    String copyDataJson =
        "{\n"
            + "      \"sourceOrgId\": \"org-5Hsdjx\",\n"
            + "            \"sourceDatasetId\": \"model-61\",\n"
            + "            \"targetOrgId\": \"org-11\",\n"
            + "            \"targetDatasetId\": \"model-61\",\n"
            + "            \"interval\": \"2020-05-06T23:50:13Z/2023-05-08T05:10:13Z\"\n"
            + "    }";
    client.exchange(
        HttpRequest.POST("/profiles/copy/false", copyDataJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Delete Preview
    String delJson = "{\"orgId\":\"org-11\",\"datasetId\":\"model-61\"}";
    String delJsonSingleCol =
        "{\"orgId\":\"org-11\",\"datasetId\":\"model-61\",\"columnName\":\"market_price\"}";
    DataDeletionPreviewResponse preview =
        client.retrieve(
            HttpRequest.POST("/profiles/deleteProfileRequests/preview", delJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertTrue(preview.getNumRows() > 0); // Yup, there's stuff to delete

    DataDeletionPreviewResponse previewSingle =
        client.retrieve(
            HttpRequest.POST("/profiles/deleteProfileRequests/preview", delJsonSingleCol)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertTrue(previewSingle.getNumRows() > 0); // Yup, there's stuff to delete
    assertTrue(
        previewSingle.getNumRows() < preview.getNumRows()); // Less deleted with additional filter
  }

  @SneakyThrows
  @Test
  public void testAnalysisDeletionFlow() {
    val client = httpClient.toBlocking();

    // Generate some sample data
    String json =
        IOUtils.toString(
            Objects.requireNonNull(
                getClass().getResourceAsStream("/queries/adhocAnomalyGenerator.json")),
            StandardCharsets.UTF_8);
    val postReq =
        HttpRequest.POST("/analysis/runAnalyzer", json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val resp = client.retrieve(postReq, AdHocMonitorResponse.class);

    // Copy the results over to the main tables so we can play around with data deletion APIs
    client.exchange(
        HttpRequest.POST(String.format("/analysis/promoteAdhocResults/%s", resp.runId), "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Grab anomalies
    val anomalyFetchRequest =
        HttpRequest.POST(
            "/analysis/getAnalyzerResults/",
            "{\"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"columnNames\":[\"market_price\",\"alldifffloat\",\"alldiffint\",\"alldiffstr\",\"date\",\"float\",\"int\",\"int-doublingnull\",\"int-doublingunique\",\"nan\",\"string\",\"strthenint\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\",\"onlyAnomalies\":true,\"includeFailures\":false}");
    val analyzerResults =
        client.retrieve(
            anomalyFetchRequest
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    String analysisId = null;
    for (val a : objectMapper.readTree(analyzerResults)) {
      if (a.get("anomalyCount").asInt() == 1) {
        analysisId = a.get("analysisId").asText();
      }
    }
    // we will need this analysisId later to test markUnhelpful.
    assertNotNull(analysisId);

    int numAnomalies = objectMapper.readTree(analyzerResults).size();

    // Promoting adhoc should be idepodent, run it again and make sure the counts are stable
    client.exchange(
        HttpRequest.POST(String.format("/analysis/promoteAdhocResults/%s", resp.runId), "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));
    val analyzerResults2 =
        client.retrieve(
            anomalyFetchRequest
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    int numAnomalies2 = objectMapper.readTree(analyzerResults).size();
    assertEquals(numAnomalies, numAnomalies2);

    // List monitors for analysis
    String monitorListQuery =
        "{\n"
            + "  \"request\": {\n"
            + "    \"orgId\": \"org-5Hsdjx\",\n"
            + "    \"datasetId\": \"model-61\",\n"
            + "    \"interval\": \"2022-12-01T00:00:00.00Z/P30D\",\n"
            + "    \"targetLevel\": \"column\",\n"
            + "    \"targetSegment\": {\n"
            + "      \"tags\": [\n"
            + "      ]\n"
            + "    },\n"
            + "    \"targetColumn\": \"market_price\",\n"
            + "    \"targetMetric\": \"histogram\",\n"
            + "    \"offset\": 0,\n"
            + "    \"pageSize\": 100\n"
            + "  }\n"
            + "}";
    val monitorsList =
        client.retrieve(
            HttpRequest.POST("/analysis/monitors/list", monitorListQuery)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    MonitorAndAnomalyCount[] monitorList =
        objectMapper.readValue(monitorsList, MonitorAndAnomalyCount[].class);
    assertTrue(monitorList.length > 0);
    for (val o : monitorList) {
      assertEquals("numerical-drift-monitor-l7kos1", o.getMonitorId());
      assertEquals(Optional.of(0l), Optional.of(o.getAnomaliesCount()));
      assertEquals(Optional.of(8l), Optional.of(o.getTotalCount()));
    }

    // Query the wrong segment to make sure filtering works
    String monitorListQuery2 =
        "{\n"
            + "  \"request\": {\n"
            + "    \"orgId\": \"org-5Hsdjx\",\n"
            + "    \"datasetId\": \"model-61\",\n"
            + "    \"interval\": \"2022-12-08T00:00:00.00Z/P7D\",\n"
            + "    \"targetLevel\": \"column\",\n"
            + "    \"targetSegment\": {\n"
            + "      \"tags\": [{\"key\":\"house\", \"value\" : \"blue\"\n"
            + "      }]\n"
            + "    },\n"
            + "    \"targetColumn\": \"market_price\",\n"
            + "    \"targetMetric\": \"histogram\",\n"
            + "    \"offset\": 0,\n"
            + "    \"pageSize\": 100\n"
            + "  }\n"
            + "}";
    val monitorsList2 =
        client.retrieve(
            HttpRequest.POST("/analysis/monitors/list", monitorListQuery2)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(0, objectMapper.readValue(monitorsList2, MonitorAndAnomalyCount[].class).length);

    int before =
        objectMapper
            .readTree(
                client.retrieve(
                    HttpRequest.POST(
                            "/analysis/getAnomalyCounts/",
                            "{\"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                        .contentType(MediaType.APPLICATION_JSON_TYPE)
                        .accept(MediaType.APPLICATION_JSON)))
            .get(0)
            .get("anomalies")
            .asInt();

    // Mark one of them as unhelpful
    val m =
        client.exchange(
            HttpRequest.PUT("/analysis/markUnhelpful/true/" + analysisId, "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(200, m.getStatus().getCode());

    // Should have 1 fewer alert count from alert counts over time endpoint since we hide them when
    // not helpful
    String alertCountsOverTime =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals(1, objectMapper.readTree(alertCountsOverTime).size());

    // Dep on the order of tests there may be some dupes in the DB for an analysis id
    assertTrue(before > objectMapper.readTree(alertCountsOverTime).get(0).get("anomalies").asInt());

    // Scope to querying for parent anomalies (which aren't there)
    String parentAnomalies =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{ \"parentChildScope\":\"PARENTS_ONLY\", \"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("[]", parentAnomalies);

    // Ask again, but with the flag to include unhelpful alerts in the count
    val anomalyCounts =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"includeUnhelpful\":true,  \"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                ////////////////// ^
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals(
        numAnomalies, objectMapper.readTree(anomalyCounts).get(0).get("anomalies").asInt());

    alertCountsOverTime =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"includeUnhelpful\":true,  \"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                ////////////////// ^
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals(
        numAnomalies, objectMapper.readTree(alertCountsOverTime).get(0).get("anomalies").asInt());

    // Remove unhelpful mark
    client.exchange(
        HttpRequest.PUT("/analysis/markUnhelpful/false/" + analysisId, json)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Re-added to the aggregate
    alertCountsOverTime =
        client.retrieve(
            HttpRequest.POST(
                    "/analysis/getAnomalyCounts/",
                    "{\"orgId\":\"org-5Hsdjx\",\"datasetIds\":[\"model-61\"],\"granularity\":\"all\",\"segments\":[\"\"],\"columnNames\":[\"market_price\"],\"interval\":\"2021-11-12T00:00:00Z/2023-12-20T23:59:59Z\"}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));

    assertEquals(
        numAnomalies, objectMapper.readTree(alertCountsOverTime).get(0).get("anomalies").asInt());

    // Delete Preview
    String delJson = "{\"orgId\":\"org-5Hsdjx\",\"datasetId\":\"model-61\"}";
    DataDeletionPreviewResponse preview =
        client.retrieve(
            HttpRequest.POST("/analysis/deleteAnalysisRequests/preview", delJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertTrue(preview.getNumRows() > 0); // Yup, there's stuff to delete

    String delJsonSingleAnalyzer =
        "{\"orgId\":\"org-5Hsdjx\",\"datasetId\":\"model-61\", \"analyzerId\":\"unique-estimate-ratio-analyzer-l0ypa9\"}";
    DataDeletionPreviewResponse previewSingleAnalyzer =
        client.retrieve(
            HttpRequest.POST("/analysis/deleteAnalysisRequests/preview", delJsonSingleAnalyzer)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    // Scoped to a single analyzer delete should hit fewer rows
    assertTrue(preview.getNumRows() > previewSingleAnalyzer.getNumRows());

    // Queue up deletion
    client.exchange(
        HttpRequest.POST("/analysis/deleteAnalysisRequests", delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // See what's queued up for deletion
    String j =
        client.retrieve(
            HttpRequest.GET("/analysis/deleteAnalysisRequests/" + "org-5Hsdjx")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    String id = objectMapper.readTree(j).get(0).get("id").asText();

    // Cancel it
    client.exchange(
        HttpRequest.PUT("/analysis/deleteAnalysisRequests/cancel/" + id, delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Assert that wiped the queue
    val enqueuedRequests =
        client.retrieve(
            HttpRequest.GET("/analysis/deleteAnalysisRequests/" + "org-5Hsdjx")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("CANCELED", objectMapper.readTree(enqueuedRequests).get(0).get("status").asText());

    // Cool, ok lets queue it up again
    client.exchange(
        HttpRequest.POST("/analysis/deleteAnalysisRequests", delJson)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Force deletions to run now
    client.exchange(
        HttpRequest.POST("/analysis/deleteAnalysisRequests/runNow", "{}")
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    // Data should be toast, deletion preview should show nothing would be deleted if you re-ran the
    // deletion request
    preview =
        client.retrieve(
            HttpRequest.POST("/analysis/deleteAnalysisRequests/preview", delJson)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DataDeletionPreviewResponse.class);
    assertEquals(0, preview.getNumRows(), 0); // Nothing to delete, the deletion task worked

    // Request should show up as completed
    String recentRequests =
        client.retrieve(
            HttpRequest.GET("/analysis/deleteAnalysisRequests/" + "org-5Hsdjx")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON));
    assertEquals("COMPLETED", objectMapper.readTree(recentRequests).get(0).get("status").asText());

    // Force another deletion run (with nothing queued up)
    DeletionReport r =
        client.retrieve(
            HttpRequest.POST("/analysis/deleteAnalysisRequests/runNow", "{}")
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DeletionReport.class);

    // Make sure it didn't double execute a deletion request
    assertEquals(0, r.getDeletionRequestsRan());
  }
}

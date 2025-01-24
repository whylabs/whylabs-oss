package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.responses.DebugEventResponse;
import ai.whylabs.dataservice.responses.QueryDebugEventsResponse;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@MicronautTest()
public class DebugEventControllerTests extends BasePostgresTest {
  @Inject
  @Client(value = "/")
  HttpClient httpClient;

  @SneakyThrows
  @Test
  public void testCRUD() {
    val client = httpClient.toBlocking();
    String debugEvent =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"datasetTimestamp\": 1667605813000,\n"
            + "  \"content\": \"{\\\"datawarehouse_pk\\\": 552346}\",\n"
            + "  \"segmentTags\": [\n"
            + "    {\n"
            + "      \"key\": \"purpose\",\n"
            + "      \"value\": \"car\"\n"
            + "    },\n"
            + "    {\n"
            + "      \"key\": \"verification_status\",\n"
            + "      \"value\": \"Not Verified\"\n"
            + "    }\n"
            + "  ],\n"
            + "  \"tags\": [\"blah\"],\n"
            + "  \"traceId\": \"9b90120d-77a1-4b41-84f8-4258e54b5aae\"\n"
            + "}";
    client.exchange(
        HttpRequest.POST("/debugEvent/save", debugEvent)
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON));

    String querySegmented =
        "{\"orgId\":\"org-0\",\"datasetId\":\"model-0\",\"interval\": \"2022-07-01T23:50:13Z/2032-05-08T05:10:13Z\", \"segmentTags\": [[{\"key\":\"purpose\", \"value\":\"car\"}, {\"key\":\"verification_status\", \"value\":\"Not Verified\"}]]}";

    val resp =
        client.exchange(
            HttpRequest.POST("/debugEvent/querySegmented", querySegmented)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DebugEventResponse.class);

    assertEquals(resp.getBody().get().getEvents().size(), 1);

    String queryByTraceId =
        "{\"orgId\":\"org-0\",\"datasetId\":\"model-0\",\"interval\": \"2022-07-01T23:50:13Z/2032-05-08T05:10:13Z\", \"traceId\":\"9b90120d-77a1-4b41-84f8-4258e54b5aae\"}";
    val resp2 =
        client.exchange(
            HttpRequest.POST("/debugEvent/querySegmented", queryByTraceId)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DebugEventResponse.class);

    assertEquals(resp2.getBody().get().getEvents().size(), 1);

    // Make sure filtering is working
    String queryByTraceWrongId =
        "{\"orgId\":\"org-0\",\"datasetId\":\"model-0\",\"interval\": \"2022-07-01T23:50:13Z/2032-05-08T05:10:13Z\", \"traceId\":\"7b90120d-77a1-4b41-84f8-4258e54b5aae\"}";
    val resp3 =
        client.exchange(
            HttpRequest.POST("/debugEvent/querySegmented", queryByTraceWrongId)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            DebugEventResponse.class);

    assertEquals(resp3.getBody().get().getEvents().size(), 0);

    // Test the newer query API endpoint Andy wrote
    String queryV2 =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"interval\": \"2022-11-02T23:50:13Z/2022-11-06T23:50:13Z\",\n"
            + "  \"segmentTags\": [\n"
            + "  ],\n"
            + "  \"tags\": [\n"
            + "  ],\n"
            + "  \"startOffset\": 0,\n"
            + "  \"maxPageSize\": 100,\n"
            + "  \"desc\": true\n"
            + "}";
    val resp4 =
        client.retrieve(
            HttpRequest.POST("/debugEvent/query", queryV2)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            QueryDebugEventsResponse.class);

    assertEquals(1, resp4.getEvents().size());
    assertFalse(resp4.getIsTruncated());

    // Validate tag filtering works on it, negative case
    String queryV3 =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"interval\": \"2022-11-02T23:50:13Z/2022-11-06T23:50:13Z\",\n"
            + "  \"segmentTags\": [\n"
            + "  ],\n"
            + "  \"tags\": [\"llm\" \n"
            + "  ],\n"
            + "  \"startOffset\": 0,\n"
            + "  \"maxPageSize\": 100,\n"
            + "  \"desc\": true\n"
            + "}";
    val resp5 =
        client.retrieve(
            HttpRequest.POST("/debugEvent/query", queryV3)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            QueryDebugEventsResponse.class);

    assertEquals(resp5.getEvents().size(), 0);

    // Validate tag filtering works on it, positive case
    String queryV4 =
        "{\n"
            + "  \"orgId\": \"org-0\",\n"
            + "  \"datasetId\": \"model-0\",\n"
            + "  \"interval\": \"2022-11-02T23:50:13Z/2022-11-06T23:50:13Z\",\n"
            + "  \"segmentTags\": [\n"
            + "  ],\n"
            + "  \"tags\": [\"blah\" \n"
            + "  ],\n"
            + "  \"startOffset\": 0,\n"
            + "  \"maxPageSize\": 100,\n"
            + "  \"desc\": true\n"
            + "}";
    val resp6 =
        client.retrieve(
            HttpRequest.POST("/debugEvent/query", queryV4)
                .contentType(MediaType.APPLICATION_JSON_TYPE)
                .accept(MediaType.APPLICATION_JSON),
            QueryDebugEventsResponse.class);

    assertEquals(resp6.getEvents().size(), 1);
  }
}

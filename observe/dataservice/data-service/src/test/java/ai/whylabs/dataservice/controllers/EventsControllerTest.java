package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ai.whylabs.core.configV3.structure.CustomerEvent;
import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.models.CustomerEventsRequest;
import ai.whylabs.dataservice.responses.GetCustomerEventsResponse;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

public class EventsControllerTest extends BasePostgresTest {
  @Inject private EventsController eventsController;

  @Inject
  @Client("/")
  HttpClient httpClient;

  @SneakyThrows
  @Test
  public void testLoadCustomerEvents() {
    String orgId = "org-123";
    String datasetId = "dataset-xyz";
    String userId = "user-123";
    String eventType = "DEPLOYMENT";
    Long eventTimestamp = 0L;
    String description = "This was deployed today";

    // Create a customer event
    val reqUri = String.format("/events/%s/%s/store", orgId, datasetId);
    val postReq =
        HttpRequest.POST(reqUri, new CustomerEvent(userId, eventType, eventTimestamp, description))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val postResp = httpClient.toBlocking().exchange(postReq, String.class);
    assertEquals(200, postResp.getStatus().getCode());

    GetCustomerEventsResponse shouldLoadEvents =
        eventsController.load(
            orgId,
            datasetId,
            CustomerEventsRequest.builder().startDate(0L).endDate(0L).limit(10).offset(0).build());
    assertEquals(1, shouldLoadEvents.getCustomerEvents().size());
    assertEquals(userId, shouldLoadEvents.getCustomerEvents().get(0).getUserId());
    assertEquals(eventType, shouldLoadEvents.getCustomerEvents().get(0).getEventType());
    assertEquals(eventTimestamp, shouldLoadEvents.getCustomerEvents().get(0).getEventTimestamp());
    assertEquals(description, shouldLoadEvents.getCustomerEvents().get(0).getDescription());
  }

  @SneakyThrows
  @Test
  public void testSaveCustomerEventWithNullDescription() {
    String orgId = "org-123";
    String datasetId = "dataset-xyz";
    String userId = "user-123";
    String eventType = "DEPLOYMENT";
    Long eventTimestamp = 0L;

    val reqUri = String.format("/events/%s/%s/store", orgId, datasetId);
    val postReq =
        HttpRequest.POST(reqUri, new CustomerEvent(userId, eventType, eventTimestamp, null))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val postResp = httpClient.toBlocking().exchange(postReq, String.class);
    assertEquals(200, postResp.getStatus().getCode());
  }

  @SneakyThrows
  @Test
  public void testSaveCustomerEvent() {
    String orgId = "org-123";
    String datasetId = "dataset-xyz";
    String userId = "user-123";
    String eventType = "DEPLOYMENT";
    Long eventTimestamp = 0L;
    String description = "This was deployed today";

    // Create a customer event
    val reqUri = String.format("/events/%s/%s/store", orgId, datasetId);
    val postReq =
        HttpRequest.POST(reqUri, new CustomerEvent(userId, eventType, eventTimestamp, description))
            .contentType(MediaType.APPLICATION_JSON_TYPE)
            .accept(MediaType.APPLICATION_JSON);
    val postResp = httpClient.toBlocking().exchange(postReq, String.class);
    assertEquals(200, postResp.getStatus().getCode());
  }
}

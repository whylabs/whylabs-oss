package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.CustomerEvent;
import ai.whylabs.dataservice.models.CustomerEventsRequest;
import ai.whylabs.dataservice.responses.GetCustomerEventsResponse;
import ai.whylabs.dataservice.services.EventsService;
import ai.whylabs.dataservice.util.ValidateRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "Events", description = "Endpoints to manipulate customer events")
@Controller("/events")
@RequiredArgsConstructor
public class EventsController {
  @Inject private EventsService eventsService;

  @Post(
      uri = "/{orgId}/{datasetId}/store",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "storeCustomerEvent")
  public Integer store(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @Body CustomerEvent customerEvent) {
    ValidateRequest.checkNotNull(orgId, "orgId");
    ValidateRequest.checkNotNull(datasetId, "datasetId");
    ValidateRequest.checkNotNull(customerEvent.getUserId(), "userId");
    ValidateRequest.checkNotNull(customerEvent.getEventType(), "eventType");
    ValidateRequest.checkNotNull(customerEvent.getEventTimestamp(), "eventTimestamp");

    return eventsService.saveCustomerEvent(orgId, datasetId, customerEvent);
  }

  @Post(
      uri = "/{orgId}/{datasetId}/load",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "loadCustomerEvents")
  public GetCustomerEventsResponse load(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @Body CustomerEventsRequest request) {
    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());
    ValidateRequest.checkNotNull(orgId, "orgId");
    ValidateRequest.checkNotNull(datasetId, "datasetId");
    ValidateRequest.checkNotNull(request.getStartDate(), "startDate");
    ValidateRequest.checkNotNull(request.getEndDate(), "endDate");
    return eventsService.loadEvents(
        orgId,
        datasetId,
        request.getStartDate(),
        request.getEndDate(),
        request.getLimit(),
        request.getOffset());
  }
}

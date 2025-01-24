package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.requests.ListDebugEventsRequest;
import ai.whylabs.dataservice.requests.QueryDebugEventsRequest;
import ai.whylabs.dataservice.responses.DebugEventResponse;
import ai.whylabs.dataservice.responses.QueryDebugEventsResponse;
import ai.whylabs.dataservice.services.DebugEventService;
import ai.whylabs.dataservice.structures.DebugEvent;
import ai.whylabs.dataservice.util.ValidateRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Arrays;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.StringUtils;

@Slf4j
@Tag(
    name = "DebugEvent",
    description =
        "For customers to upload JSON snippets of auxiliary data to correlate with their profile data for debugging. EG: Here's some primary keys from our DB tied to this profile")
@Controller("/debugEvent")
@RequiredArgsConstructor
public class DebugEventController {

  @Inject private DebugEventService debugEventService;
  @Inject private ObjectMapper mapper;
  // Reject anything >10kb
  private static final int MAX_CONTENT = 1000 * 10;

  @Post(uri = "/save", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "saveDebugEvent")
  public void save(@Body DebugEvent e) {
    ValidateRequest.checkNotNull(e.getOrgId(), "orgId");
    ValidateRequest.checkNotNull(e.getDatasetId(), "datasetId");
    ValidateRequest.checkNotNull(e.getContent(), "content");
    ValidateRequest.checkNotNull(e.getDatasetTimestamp(), "datasetTimestamp");
    e.setCreationTimestamp(System.currentTimeMillis());

    try {
      mapper.readTree(e.getContent());
    } catch (JsonProcessingException ex) {
      throw new IllegalArgumentException("Invalid json in the content field ", ex);
    }
    if (e.getContent().length() > MAX_CONTENT) {
      throw new IllegalArgumentException(
          "Debug events must be fewer than "
              + MAX_CONTENT
              + " characters. Please contact whylabs to increase your storage cap.");
    }

    debugEventService.save(Arrays.asList(e));
  }

  @Post(
      uri = "/querySegmented",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DebugEventResponse querySegmented(@Body ListDebugEventsRequest request) {
    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());

    return debugEventService.getDebugEvents(request);
  }

  @Post(
      uri = "/query",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public QueryDebugEventsResponse queryV2(@Body QueryDebugEventsRequest request) {
    if (StringUtils.isEmpty(request.getTraceId())) {
      ValidateRequest.checkDebugEventIntervalTooWide(request.getInterval());
    }

    val r = debugEventService.query(request);
    return r;
  }
}

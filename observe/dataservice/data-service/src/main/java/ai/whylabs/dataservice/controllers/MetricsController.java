package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.metrics.DataEvaluationRequest;
import ai.whylabs.dataservice.metrics.TimeSeriesQueryRequest;
import ai.whylabs.dataservice.metrics.result.DataEvaluationResponse;
import ai.whylabs.dataservice.metrics.result.TimeSeriesQueryResponse;
import ai.whylabs.dataservice.metrics.service.DataEvaluationService;
import ai.whylabs.dataservice.metrics.service.TimeSeriesMetricService;
import ai.whylabs.dataservice.services.GlobalStatusService;
import ai.whylabs.dataservice.util.ValidateRequest;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import javax.annotation.Nullable;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Tag(name = "Metrics")
@Controller("/metrics")
@RequiredArgsConstructor
public class MetricsController {
  @Inject private final TimeSeriesMetricService timeSeriesMetricService;
  @Inject private final DataEvaluationService dataEvaluationService;

  @Inject private final MeterRegistry meterRegistry;
  @Inject private GlobalStatusService globalStatusService;

  @Post(
      uri = "/timeseries/{orgId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TimeSeriesQueryResponse timeseries(
      @Nullable @Parameter(hidden = true) @RequestAttribute("X-REQUEST-ID") UUID requestId,
      @PathVariable String orgId,
      @Body TimeSeriesQueryRequest query,
      @Nullable
          @Parameter(hidden = true)
          @Header(value = "X-WHYLABS-ID", defaultValue = "anonymous")
          String identity) {
    if (requestId == null) {
      requestId = UUID.randomUUID();
    }
    ValidateRequest.checkMaintenanceWindow(query.getInterval(), globalStatusService);
    query.validate();

    val response = timeSeriesMetricService.timeseries(orgId, query, identity);
    response.setId(requestId);
    return response;
  }

  @Post(
      uri = "/dataEvaluation/{orgId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DataEvaluationResponse dataEvaluation(
      @PathVariable String orgId, @Body DataEvaluationRequest request) {
    request.validate();
    return dataEvaluationService.dataEvaluationQueryProcessor(orgId, request);
  }
}

package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.requests.CloneCustomDashboardRequest;
import ai.whylabs.dataservice.requests.CustomDashboardUpsertRequest;
import ai.whylabs.dataservice.services.CustomDashboardService;
import ai.whylabs.dataservice.structures.CustomDashboard;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Tag(name = "CustomDashboard", description = "Endpoints to manage custom dashboards")
@Controller("/customDashboard/{orgId}")
@RequiredArgsConstructor
public class CustomDashboardController {

  @Inject private CustomDashboardService customDashboardService;

  @Post(uri = "/save", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "SaveCustomDashboard")
  public CustomDashboard save(
      @PathVariable String orgId, @Body CustomDashboardUpsertRequest customDashboard) {
    return customDashboardService.persist(orgId, customDashboard);
  }

  @Get(uri = "/get/{dashboardId}", produces = MediaType.APPLICATION_JSON)
  public CustomDashboard findById(@PathVariable String orgId, @PathVariable String dashboardId) {
    Optional<CustomDashboard> d = customDashboardService.findById(orgId, dashboardId);
    return d.orElse(null);
  }

  @Get(uri = "/list", produces = MediaType.APPLICATION_JSON)
  public List<CustomDashboard> list(@PathVariable String orgId) {
    return customDashboardService.list(orgId);
  }

  @Post(
      uri = "/clone",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void clone(@PathVariable String orgId, @Body CloneCustomDashboardRequest body) {
    customDashboardService.clone(orgId, body);
  }

  @Delete(uri = "/delete/{dashboardId}", produces = MediaType.APPLICATION_JSON)
  public void deleteDashboard(@PathVariable String orgId, @PathVariable String dashboardId) {
    customDashboardService.markAsDeleted(orgId, dashboardId);
  }
}

package ai.whylabs.dataservice.controllers;

import ai.whylabs.dataservice.enums.PostgresQueues;
import ai.whylabs.dataservice.responses.MaintenanceWindowResponse;
import ai.whylabs.dataservice.responses.QueueStatsResponse;
import ai.whylabs.dataservice.services.AdminService;
import ai.whylabs.dataservice.services.GlobalStatusService;
import ai.whylabs.dataservice.services.OrgIdCountResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.SQLException;
import java.util.List;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Tag(name = "Admin", description = "Administration endpoints")
@Controller("/admin")
@RequiredArgsConstructor
public class AdminController {
  @Inject private AdminService adminService;
  @Inject private GlobalStatusService globalStatusService;

  @Get(uri = "/getOrgIdCounts", produces = MediaType.APPLICATION_JSON)
  public OrgIdCountResponse getOrgIdCounts() {
    try {
      return adminService.getOrgIdCounts();
    } catch (SQLException e) {
      log.warn("SQL Exception in getOrgIdCounts", e);
      throw new HttpStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Server exception retrieving Org Id counts" + e.getMessage());
    }
  }

  @Post(uri = "/dataflow/setUsePgCronBasedFlows/{enabled}", produces = MediaType.APPLICATION_JSON)
  public void setUsePgCronBasedFlows(@PathVariable boolean enabled) {
    globalStatusService.setUsePgCronBasedFlows(enabled);
  }

  @Get(uri = "/dataflow/isMaintenanceWindow", produces = MediaType.APPLICATION_JSON)
  public MaintenanceWindowResponse isMaintenanceWindow() {
    val r =
        MaintenanceWindowResponse.builder()
            .isMaintenanceWindow(globalStatusService.isMaintenanceWindow())
            .build();
    return r;
  }

  @Post(
      uri = "/dataflow/initiateBronzeToSilverDataPromotions",
      produces = MediaType.APPLICATION_JSON)
  public void initiateBronzeToSilverDataPromotions() {
    globalStatusService.initiateBronzeToSilverDataPromotions();
  }

  // This starts the downtime window process
  @Post(
      uri = "/dataflow/initiateSilverToHistoricalDataPromotions",
      produces = MediaType.APPLICATION_JSON)
  public void initiateSilverToHistoricalDataPromotions() {
    globalStatusService.initiateSilverToHistoricalDataPromotions();
  }

  // Do work, unit test only. This should be ran from pg_cron in the normal flow
  @Post(uri = "/dataflow/promoteSilverToHistoricalWork", produces = MediaType.APPLICATION_JSON)
  public void promoteSilverToHistoricalWork() {
    globalStatusService.promoteSilverToHistoricalWork();
  }

  // Do work, unit test only. This should be ran from pg_cron in the normal flow
  @Post(uri = "/dataflow/promoteBronzeToSilverWork", produces = MediaType.APPLICATION_JSON)
  public void promoteBronzeToSilverWork() {
    globalStatusService.promoteBronzeToSilverWork();
  }

  // Unit test only, this should be ran from pg_cron in the normal flow
  @Post(uri = "/dataflow/pollPromotionStatus", produces = MediaType.APPLICATION_JSON)
  public void pollPromotionStatus() {
    globalStatusService.pollPromotionStatus();
  }

  // Unit test only, this should be ran from pg_cron in the normal flow
  @Post(uri = "/dataflow/pollCompressionStatus", produces = MediaType.APPLICATION_JSON)
  public void pollCompressionStatus() {
    globalStatusService.pollCompressionStatus();
  }

  // Do work, unit test only. This should be ran from pg_cron in the normal flow
  @Post(uri = "/dataflow/compressOldChunk", produces = MediaType.APPLICATION_JSON)
  public void compressOldChunk() {
    globalStatusService.compressOldChunk();
  }

  @Get(uri = "/dataflow/getQueueSize/{queue}", produces = MediaType.APPLICATION_JSON)
  public QueueStatsResponse getQueueSize(@PathVariable PostgresQueues queue) {
    return QueueStatsResponse.builder().size(globalStatusService.getQueueSize(queue)).build();
  }

  @Get(uri = "/dataflow/countQueueWorkers/{queue}", produces = MediaType.APPLICATION_JSON)
  public QueueStatsResponse countQueueWorkers(@PathVariable PostgresQueues queue) {
    return QueueStatsResponse.builder().size(globalStatusService.countQueueWorkers(queue)).build();
  }

  @Post(uri = "/dataflow/addQueueWorker/{queue}", produces = MediaType.APPLICATION_JSON)
  public QueueStatsResponse addQueueWorker(@PathVariable PostgresQueues queue) {
    return QueueStatsResponse.builder().size(globalStatusService.addQueueWorker(queue)).build();
  }

  @Post(uri = "/dataflow/removeQueueWorker/{queue}", produces = MediaType.APPLICATION_JSON)
  public QueueStatsResponse removeQueueWorker(@PathVariable PostgresQueues queue) {
    return QueueStatsResponse.builder()
        .size(globalStatusService.removeQueueWorker(queue, 1))
        .build();
  }

  @Post(uri = "/dataflow/vacuum", produces = MediaType.APPLICATION_YAML)
  public List<String> vacuumOldData() {
    return globalStatusService.vacuumOldData();
  }
}

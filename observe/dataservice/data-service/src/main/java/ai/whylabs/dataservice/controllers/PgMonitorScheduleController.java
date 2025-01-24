package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.requests.PgMonitorScheduleInitRequest;
import ai.whylabs.dataservice.requests.RewindScheduleRequest;
import ai.whylabs.dataservice.responses.ScheduledWorkCutoffResponse;
import ai.whylabs.dataservice.services.DatasetService;
import ai.whylabs.dataservice.services.MonitorConfigService;
import ai.whylabs.dataservice.services.PgMonitorScheduleService;
import ai.whylabs.dataservice.services.TagRepository;
import ai.whylabs.dataservice.structures.PgMonitorSchedule;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Tag(
    name = "MonitorScheduler",
    description = "Endpoints for interacting with the PG backed monitor scheduler")
@Controller("/monitorScheduler")
@RequiredArgsConstructor
public class PgMonitorScheduleController {

  @Inject private final PgMonitorScheduleService pgMonitorScheduleService;
  @Inject private final MonitorConfigService monitorConfigService;
  @Inject private final TagRepository tagRepository;
  @Inject private final DatasetService datasetService;

  @Delete(
      uri = "/list/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void clear(@PathVariable String orgId, @PathVariable String datasetId) {
    pgMonitorScheduleService.clear(orgId, datasetId);
  }

  @Get(
      uri = "/list/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<PgMonitorSchedule> list(@PathVariable String orgId, @PathVariable String datasetId) {
    return pgMonitorScheduleService.listSchedules(orgId, datasetId);
  }

  /**
   * Scheduler goes foward in time. Get the cutoff dates for which newly uploaded data will have
   * been skipped by the scheduled flow as its been uploaded too late.
   *
   * @param orgId
   * @param datasetId
   * @return
   */
  @Get(
      uri = "/scheduledWorkCutoffs/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public ScheduledWorkCutoffResponse getScheduledWorkCutoffs(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return ScheduledWorkCutoffResponse.builder()
        .cutoffs(pgMonitorScheduleService.getScheduledWorkCutoffs(orgId, datasetId))
        .build();
  }

  // One time API to loop over all the monitor configs and generate their schedule rows. Subsequent
  // changes are made as monitor configs get modified.
  @Post(uri = "/init", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  public void initSchedules(@Body PgMonitorScheduleInitRequest rqst) {
    pgMonitorScheduleService.clearSchedules();
    for (val s : monitorConfigService.getAllConfigs()) {
      val dataset = datasetService.getDataset(s.getOrgId(), s.getDatasetId());
      if (dataset != null && dataset.getActive() != null && dataset.getActive() == false) {
        continue;
      }

      ZonedDateTime backdate = null;
      if (rqst.getBackdate() != null) {
        backdate = ZonedDateTime.parse(rqst.getBackdate(), DateTimeFormatter.ISO_OFFSET_DATE_TIME);
      }

      try {
        pgMonitorScheduleService.updateSchedules(
            null, MonitorConfigV3JsonSerde.parseMonitorConfigV3(s), backdate);
      } catch (Exception e) {
        log.error(
            "Unable to set monitor schedule for org {} dataset {} due to {}",
            s.getOrgId(),
            s.getDatasetId(),
            e.getMessage(),
            e);
      }
    }
  }

  @Post(
      uri = "/forceRun",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void forceRun() {
    pgMonitorScheduleService.queueUpWork();
  }

  @Post(
      uri = "/rewindSchedule",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void rewindSchedule(RewindScheduleRequest rqst) {
    pgMonitorScheduleService.rewindSchedule(rqst);
  }
}

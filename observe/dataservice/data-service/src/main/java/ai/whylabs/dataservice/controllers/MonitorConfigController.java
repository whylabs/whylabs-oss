package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.inclusion.BackfillGracePeriodDurationPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.adhoc.AsyncRequestDispatcher;
import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.requests.BackfillRequest;
import ai.whylabs.dataservice.requests.ConfigPatchRequest;
import ai.whylabs.dataservice.services.MonitorConfigService;
import ai.whylabs.dataservice.services.PgMonitorScheduleService;
import ai.whylabs.dataservice.util.MonitorConfigUtil;
import com.google.common.base.Preconditions;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Optional;
import javax.inject.Inject;
import javax.json.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;

@Slf4j
@Tag(name = "MonitorConfig", description = "Endpoints to configure monitor configuration")
@Controller("/monitorConfig")
@RequiredArgsConstructor
public class MonitorConfigController {

  @Inject private final MonitorConfigService monitorConfigService;
  @Inject private final PgMonitorScheduleService pgMonitorScheduleService;
  @Inject private AsyncRequestDispatcher asyncRequestDispatcher;

  @Get(
      uri = "/getLatest/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public Optional<MonitorConfigV3Row> getLatest(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return monitorConfigService.getLatest(orgId, datasetId);
  }

  @Get(
      uri = "/patch/{orgId}/{datasetId}/{version1}/{version2}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public String versionDiff(
      @PathVariable String orgId,
      @PathVariable String datasetId,
      @PathVariable Long version1,
      @PathVariable Long version2) {

    val diff = monitorConfigService.versionDiff(orgId, datasetId, version1, version2);
    return diff.map(JsonPatch::toJsonArray).orElse(JsonArray.EMPTY_JSON_ARRAY).toString();
  }

  @Post(
      uri = "/patch",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public String versionDiff(@Body ConfigPatchRequest rqst) {

    val diff =
        monitorConfigService.versionDiff(
            rqst.getOrgId(), rqst.getDatasetId(), rqst.getVersion1(), rqst.getVersion2());

    return diff.map(JsonPatch::toJsonArray).orElse(JsonArray.EMPTY_JSON_ARRAY).toString();
  }

  @Post(uri = "/save", consumes = MediaType.APPLICATION_JSON, produces = MediaType.APPLICATION_JSON)
  @Operation(operationId = "saveMonitorConfig")
  public void save(@Body MonitorConfigV3Row rqst) {
    val newConf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(rqst.getJsonConf());
    Preconditions.checkArgument(rqst.getOrgId().equals(newConf.getOrgId()));
    Preconditions.checkArgument(rqst.getDatasetId().equals(newConf.getDatasetId()));

    Optional<MonitorConfigV3Row> old =
        monitorConfigService.getLatest(rqst.getOrgId(), rqst.getDatasetId());
    // if it's not the latest config, we should not update the schedules
    if (!monitorConfigService.save(rqst)) return;

    // Keep the scheduler up to date with any newly added analyzer schedules
    // Autobackfills are a nice to have, more important that we don't let any bugs reject writes ^
    try {
      if (old.isPresent()) {
        val oldConf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(old.get().getJsonConf());
        pgMonitorScheduleService.updateSchedules(oldConf, newConf, null);

        for (val a : MonitorConfigUtil.getNewAnalyzers(oldConf, newConf)) {
          triggerBackfill(newConf, a);
        }
      } else {

        pgMonitorScheduleService.updateSchedules(null, newConf, null);
        for (val a : newConf.getAnalyzers()) {
          triggerBackfill(newConf, a);
        }
      }
    } catch (Exception e) {
      log.info(
          "Unable to schedule a backfill for org {} dataset {} due to ",
          rqst.getOrgId(),
          rqst.getDatasetId(),
          e);
    }
  }

  public void triggerBackfill(MonitorConfigV3 newConf, Analyzer a) {
    ZonedDateTime end =
        ComputeJobGranularities.subtract(
            ComputeJobGranularities.truncateTimestamp(
                ZonedDateTime.now(), newConf.getGranularity()),
            newConf.getGranularity(),
            1);
    ZonedDateTime start =
        ComputeJobGranularities.subtract(
            end,
            Granularity.daily,
            BackfillGracePeriodDurationPredicate.getDays(a, newConf.getGranularity()));
    Interval i = new Interval(start.toInstant().toEpochMilli(), end.toInstant().toEpochMilli());
    val backfillRequest = new BackfillRequest();
    backfillRequest.setOrgId(newConf.getOrgId());
    backfillRequest.setDatasetId(newConf.getDatasetId());
    backfillRequest.setAnalyzerIds(Arrays.asList(a.getId()));
    backfillRequest.setInterval(i);
    backfillRequest.setQueue(AsyncAnalysisQueue.backfill);
    asyncRequestDispatcher.triggerBackfill(backfillRequest, newConf);
  }
}

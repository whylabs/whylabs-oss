package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.configV3.structure.enums.Classifier;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.requests.MaxIoSegmentedRequest;
import ai.whylabs.dataservice.services.EntitySchemaService;
import ai.whylabs.dataservice.services.LegacySegmentRepository;
import ai.whylabs.dataservice.services.MetricsService;
import ai.whylabs.dataservice.services.MonitorConfigService;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.inject.Inject;
import javax.ws.rs.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;

@Slf4j
@Tag(name = "Render", description = "Endpoints to handle pre-rendering expensive queries")
@Controller("/render")
@RequiredArgsConstructor
public class PreRenderController {

  @Inject private MonitorConfigService monitorConfigService;
  @Inject private EntitySchemaService entitySchemaService;

  @Inject private MetricsService metricsService;
  @Inject private LegacySegmentRepository legacySegmentRepository;

  @Post(uri = "/maxio/recent/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public void renderMaxIoRecent(@PathVariable String orgId, @PathVariable String datasetId) {
    val r = monitorConfigService.getLatest(orgId, datasetId);
    if (!r.isPresent()) {
      throw new NotFoundException(
          "Could not locate monitor config for this dataset. Might need to refresh the config table.");
    }
    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(r.get().getJsonConf());

    ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
    now = ComputeJobGranularities.truncateTimestamp(now, conf.getGranularity());
    val i =
        new Interval(now.minusDays(7).toInstant().toEpochMilli(), now.toInstant().toEpochMilli());

    GetEntitySchemaRequest req = new GetEntitySchemaRequest();
    req.setOrgId(orgId);
    req.setDatasetId(datasetId);

    val request =
        MaxIoSegmentedRequest.builder()
            .orgId(orgId)
            .datasetId(datasetId)
            .interval(i)
            .granularity(DataGranularity.valueOf(conf.getGranularity().name()))
            .outputColumns(getOutputColumns(entitySchemaService.getWithCaching(req)))
            .build();

    log.info("Rendering segmented maxio {} {} {}", orgId, datasetId, i);
    metricsService.maxIoSegmentedHydrateCache(request);
  }

  @Post(uri = "/maxio/all/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public void renderMaxIoAll(@PathVariable String orgId, @PathVariable String datasetId) {
    val r = monitorConfigService.getLatest(orgId, datasetId);
    if (!r.isPresent()) {
      throw new NotFoundException(
          "Could not locate monitor config for this dataset. Might need to refresh the config table.");
    }
    GetEntitySchemaRequest req = new GetEntitySchemaRequest();
    req.setOrgId(orgId);
    req.setDatasetId(datasetId);

    val conf = MonitorConfigV3JsonSerde.parseMonitorConfigV3(r.get().getJsonConf());
    val request =
        MaxIoSegmentedRequest.builder()
            .orgId(orgId)
            .datasetId(datasetId)
            .granularity(DataGranularity.valueOf(conf.getGranularity().name()))
            .outputColumns(getOutputColumns(entitySchemaService.getWithCaching(req)))
            .build();

    metricsService.maxIoSegmentedHydrateCacheAllData(Arrays.asList(request), 52 * 5);
  }

  @Post(uri = "/maxio/auto", produces = MediaType.APPLICATION_JSON)
  public void renderAllLargeDatasets() {
    renderAllLargeDatasets(52 * 5);
  }

  public void renderAllLargeDatasets(int weeks) {
    List<MaxIoSegmentedRequest> requests = new ArrayList<>();

    // Queue up wide datasets (lots of columns)
    for (val schema : monitorConfigService.getWideDatasets()) {
      val conf = monitorConfigService.getLatest(schema.getOrgId(), schema.getDatasetId());

      requests.add(
          MaxIoSegmentedRequest.builder()
              .orgId(schema.getOrgId())
              .datasetId(schema.getDatasetId())
              .granularity(
                  conf.isPresent()
                      ? DataGranularity.valueOf(
                          MonitorConfigV3JsonSerde.parseMonitorConfigV3(conf.get())
                              .getGranularity()
                              .name())
                      : DataGranularity.daily)
              .outputColumns(getOutputColumns(schema))
              .build());
    }
    // Queue up highly segmented datasets
    for (val orgDataset : legacySegmentRepository.getHighlySegmented()) {
      val conf = monitorConfigService.getLatest(orgDataset.getLeft(), orgDataset.getRight());
      GetEntitySchemaRequest r = new GetEntitySchemaRequest();
      r.setOrgId(orgDataset.getLeft());
      r.setDatasetId(orgDataset.getRight());
      val schema = entitySchemaService.getWithCaching(r);
      if (schema == null) {
        continue;
      }

      requests.add(
          MaxIoSegmentedRequest.builder()
              .orgId(orgDataset.getLeft())
              .datasetId(orgDataset.getRight())
              .granularity(
                  conf.isPresent()
                      ? DataGranularity.valueOf(
                          MonitorConfigV3JsonSerde.parseMonitorConfigV3(conf.get())
                              .getGranularity()
                              .name())
                      : DataGranularity.daily)
              .outputColumns(getOutputColumns(schema))
              .build());
    }
    metricsService.maxIoSegmentedHydrateCacheAllData(requests, weeks);
  }

  private List<String> getOutputColumns(EntitySchema schema) {
    List<String> outputColumns = new ArrayList<>();
    for (val c : schema.getColumns().entrySet()) {
      if (c.getValue() != null
          && c.getValue().getClassifier() != null
          && c.getValue().getClassifier().equals(Classifier.output)) {
        outputColumns.add(c.getKey());
      }
    }
    return outputColumns;
  }
}

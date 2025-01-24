package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.requests.BackfillDatasetTableRequest;
import ai.whylabs.dataservice.requests.ColumnStatRequest;
import ai.whylabs.dataservice.requests.ResourceTag;
import ai.whylabs.dataservice.requests.TimeBoundaryQuery;
import ai.whylabs.dataservice.responses.ColumnStatsResponse;
import ai.whylabs.dataservice.responses.LoopedDatasetResponse;
import ai.whylabs.dataservice.responses.LoopeddataResponseRow;
import ai.whylabs.dataservice.services.*;
import ai.whylabs.dataservice.structures.Dataset;
import ai.whylabs.dataservice.structures.KeyValueTag;
import com.google.common.collect.ImmutableSet;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Tag(name = "Datasets", description = "Endpoints to configure datasets")
@Controller("/dataset")
@RequiredArgsConstructor
public class DatasetController {
  @Inject private final DatasetService datasetService;
  @Inject private final ColumnStatsService columnStatsService;
  @Inject private MonitorConfigService monitorConfigService;
  @Inject private final TagRepository tagRepository;
  @Inject private final ProfileService profileService;

  /**
   * For testing purposes its handy to be able to adjust the threshold on the fly
   *
   * @param threshold
   */
  @Post(
      uri = "/checkStagingAccessAllowed/adjustThreshold/{threshold}",
      produces = MediaType.APPLICATION_JSON)
  public void checkStagingAccessAllowed(@PathVariable Long threshold) {
    datasetService.adjustStagingAccessThreshold(threshold);
  }

  /** One time backfill org & dataset tables from a songbird metadata S3 dump */
  @Post(uri = "/backfill", produces = MediaType.APPLICATION_JSON)
  public void run(@Body BackfillDatasetTableRequest request) {
    datasetService.populateOrgDatasetTables(request.getS3Path(), false);
  }

  /** One time backfill dataset creation time from a songbird metadata S3 dump */
  @Post(uri = "/backfill-creation-time", produces = MediaType.APPLICATION_JSON)
  public void backfillCreationTime(@Body BackfillDatasetTableRequest request) {
    datasetService.populateOrgDatasetTables(request.getS3Path(), true);
  }

  @Post(uri = "/writeDataset", produces = MediaType.APPLICATION_JSON)
  public void writeDataset(@Body Dataset dataset) {
    datasetService.persist(dataset);
    if (dataset.getActive() != null && !dataset.getActive()) {
      monitorConfigService.toggle(dataset.getOrgId(), dataset.getDatasetId(), false);
    } else {
      monitorConfigService.toggle(dataset.getOrgId(), dataset.getDatasetId(), true);
    }
  }

  @Get(uri = "/getDataset/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public Dataset getDataset(@PathVariable String orgId, @PathVariable String datasetId) {
    return datasetService.getDataset(orgId, datasetId);
  }

  @Get(uri = "/listDatasets/{orgId}", produces = MediaType.APPLICATION_JSON)
  public List<Dataset> listDatasets(
      @PathVariable String orgId, @QueryValue Optional<Boolean> includeInactive) {
    return datasetService.listDatasets(orgId, includeInactive.orElse(false));
  }

  @Post(uri = "/resourceTag", produces = MediaType.APPLICATION_JSON)
  public ResourceTag writeResourceTag(@Body ResourceTag tag) {
    try {
      if (tag.getKey() == null) {
        throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Tag key must not be null");
      }
      return datasetService.saveResourceTag(tag);
    } catch (Exception e) {
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "Tag key must not exist for the resource");
    }
  }

  @Put(uri = "/resourceTag", produces = MediaType.APPLICATION_JSON)
  public void replaceResourceTag(@Body ResourceTag tag) {
    if (tag.getKey() == null) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Tag key must not be null");
    }
    datasetService.replaceResourceTag(tag);
  }

  @Get(uri = "/resourceTag/{orgId}/{resourceId}", produces = MediaType.APPLICATION_JSON)
  public List<KeyValueTag> listResourceTags(
      @PathVariable String orgId, @PathVariable String resourceId) {
    return datasetService.listResourceTags(orgId, resourceId);
  }

  @Delete(uri = "/resourceTag/{orgId}/{resourceId}/{tagKey}", produces = MediaType.APPLICATION_JSON)
  public void deleteResourceTagGroup(
      @PathVariable String orgId, @PathVariable String resourceId, @PathVariable String tagKey) {
    datasetService.deleteResourceTags(orgId, resourceId, ImmutableSet.of(tagKey));
  }

  @Delete(
      uri = "/resourceTag/{orgId}/{resourceId}/{tagKey}/{tagValue}",
      produces = MediaType.APPLICATION_JSON)
  public void deleteResourceTag(
      @PathVariable String orgId,
      @PathVariable String resourceId,
      @PathVariable String tagKey,
      @PathVariable String tagValue) {
    datasetService.deleteResourceTagKeyValue(orgId, resourceId, tagKey, tagValue);
  }

  /** Rollup the columns_new_arrival_queue table into column_stats */
  @Post(uri = "/columnStats/rollup", produces = MediaType.APPLICATION_JSON)
  public void rollupColumnStats() {
    columnStatsService.rollupColumnStats();
  }

  @SneakyThrows
  @Post(uri = "/columnStats/query", produces = MediaType.APPLICATION_JSON)
  public ColumnStatsResponse queryColumnStats(@Body ColumnStatRequest request) {
    return columnStatsService.getColumnStats(request);
  }

  /**
   * Demo datasets are generally carefully curated and uploaded once. Problem is they become old
   * data pretty quickly which makes it hard to jump around different datasets with different data
   * lineages. This endpoint figures out a good loop point based on data lineage and enableds a
   * re-upload of data into the future to keep the dataset fresh.
   *
   * @param orgId
   * @param datasetId
   * @return
   */
  @Post(uri = "/dataLooping/enable/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public void enableDataLooping(@PathVariable String orgId, @PathVariable String datasetId) {
    val q = new TimeBoundaryQuery();
    q.setOrgId(orgId);
    q.setDatasetIds(Arrays.asList(datasetId));
    q.setGranularity(DataGranularity.daily);
    val r = tagRepository.timeBoundary(q);
    for (val e : r.getRows()) {
      val conf = monitorConfigService.getLatestConf(orgId, datasetId);
      val start = ComputeJobGranularities.truncateTimestamp(e.getStart(), conf.getGranularity());
      val end = ComputeJobGranularities.truncateTimestamp(e.getEnd(), conf.getGranularity());
      datasetService.enableDataLooping(orgId, datasetId, start, end);
    }
  }

  /**
   * Testing only, do what the scheduled task would otherwise do for us and copy the next bucket of
   * data
   */
  @Post(uri = "/dataLooping/trigger", produces = MediaType.APPLICATION_JSON)
  public void triggerDataLoop() {
    LoopedDatasetResponse response = null;
    while (response == null || response.getRows().size() > 0) {
      response = datasetService.getLoopedDatasets();
      reuploadData(response.getRows());
    }
  }

  private void reuploadData(List<LoopeddataResponseRow> response) {
    for (val r : response) {
      val bucket = ZonedDateTime.ofInstant(Instant.ofEpochMilli(r.getBucket()), ZoneOffset.UTC);
      val start = bucket.minusDays(r.getWindow());
      val end = start.plusDays(1);
      log.info(
          "Demo data {} {} {}-{} is being cloned {}days ahead",
          r.getOrgId(),
          r.getDatasetId(),
          start,
          end,
          r.getWindow());
      profileService.cloneDemoData(
          r.getOrgId(),
          r.getDatasetId(),
          start.toInstant().toEpochMilli(),
          end.toInstant().toEpochMilli(),
          r.getWindow() + 1);
      datasetService.advanceDataLoop(
          r.getOrgId(), r.getDatasetId(), bucket.plusDays(1).toInstant().toEpochMilli());
    }
  }
}

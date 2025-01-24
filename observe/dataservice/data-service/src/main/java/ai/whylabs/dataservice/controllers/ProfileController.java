package ai.whylabs.dataservice.controllers;

import static ai.whylabs.dataservice.services.ProfileService.DEFAULT_PROMOTION_LOOKBACK_DAYS;
import static com.shaded.whylabs.com.apache.commons.lang3.exception.ExceptionUtils.getRootCause;
import static java.util.Objects.isNull;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.cache.CacheService;
import ai.whylabs.dataservice.enums.DeletionStatus;
import ai.whylabs.dataservice.enums.SegmentRequestScope;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.requests.ReindexFromCloudTrailRequest;
import ai.whylabs.dataservice.responses.*;
import ai.whylabs.dataservice.services.*;
import ai.whylabs.dataservice.streaming.AuditRow;
import ai.whylabs.dataservice.structures.DeleteProfile;
import ai.whylabs.dataservice.tokens.RetrievalTokenService;
import ai.whylabs.dataservice.util.ValidateRequest;
import ai.whylabs.ingestion.payloads.ProfileReadRequest;
import ai.whylabs.ingestion.payloads.ReindexFromS3Request;
import ai.whylabs.insights.InsightEntry;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.math.BigInteger;
import java.sql.SQLException;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Interval;

@Slf4j
@Tag(name = "Profile", description = "Endpoints to manage profiles")
@Controller("/profiles")
@RequiredArgsConstructor
public class ProfileController {

  @Inject private final ProfileService profileService;
  @Inject private final IndexerService indexerService;
  @Inject private final TagRepository tagRepository;
  @Inject private final DatasetMetricsService datasetMetricsService;
  @Inject private final MetricsService metricsService;
  @Inject private final ProfileDeletionRepository profileDeletionRepository;
  @Inject private final LegacySegmentRepository legacySegmentRepository;
  @Inject private final ModelService modelService;
  @Inject private MonitorConfigService monitorConfigService;
  @Inject private DataSvcConfig config;
  @Inject private CacheService cache;
  @Inject private final ProfileInsightsService insightsService;
  @Inject private RetrievalTokenService retrievalTokenService;
  @Inject private GlobalStatusService globalStatusService;

  private static final String ROLLUP_ENDPOINT = "/profileRollup/";
  private static final String MAX_IO_SEGMENTED_ENDPOINT = "/maxioSegmented";
  private static final String MAX_IO_ENDPOINT = "/maxio";

  private static final String INSIGHTS_SINGLE_COUNT = "/insights/single/count";
  private static final String INSIGHTS_SINGLE = "/insights/single";

  @Post(uri = "/timeBoundary", produces = MediaType.APPLICATION_JSON)
  public TimeBoundaryResponse timeBoundary(@Body TimeBoundaryQuery timeBoundaryQuery) {
    log.debug("Time boundary request: {}", timeBoundaryQuery);
    return tagRepository.timeBoundary(timeBoundaryQuery);
  }

  @Post(
      uri = "/copy/{async}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void copy(@Body CopyDataRequest request, @PathVariable Boolean async) {
    ValidateRequest.checkMaintenanceWindow(request.getInterval(), globalStatusService);
    log.info("Copy api called {}", request);
    if (async) {
      profileService.copyAysnc(request);
    } else {
      profileService.copy(request);
    }
  }

  @Post(
      uri = "/timeSeries",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<TimeSeriesProfileResponse> getBatchDateRangeQuery(
      @Body TimeSeriesProfileRequest request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), CountAnalyzerRunRequest.Fields.datasetIds);
    return profileService.timeSeriesQuery(request);
  }

  @Post(
      uri = "/index",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void indexProfile(@Body ProfileReadRequest readFileRequest) {
    log.debug("Index profile: {}", readFileRequest);

    profileService.ingestProfile(readFileRequest.getFile(), "indexProfile");
  }

  /**
   * This is a scheduled task, but for the sake of writing unit tests its easier to have a method
   * that forces a run so you aren't putting sleep statements in a unit test.
   */
  @Post(
      uri = "/forceTagTableRollup",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void rollupTagsTable() {
    profileService.rollupTagsTable();
  }

  /**
   * Utility method for deleting an audit entry by filename thus enabling re-ingestion. This
   * endpoint isn't meant for end-users, it's just to make testing a bit easier.
   *
   * @param readFileRequest
   */
  @Delete(
      uri = "/audit",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void deleteAuditEntry(@Body ProfileReadRequest readFileRequest) {
    log.debug("Index profile: {}", readFileRequest);
    profileService.deleteAuditEntry(readFileRequest.getFile());
  }

  @Post(
      uri = "/indexFromS3",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.TEXT_PLAIN)
  public String indexProfile(@Body ReindexFromS3Request request) {
    if (config.isEnableBackfill()) {
      log.debug("Index profile from S3: {}", request);

      ZonedDateTime d = request.getStart();
      while (d.isBefore(request.getEnd())) {
        indexerService.reindexFromS3(request.getBucket(), d);
        d = d.plusDays(1);
      }
      return "OK";
    } else {
      throw new HttpStatusException(
          HttpStatus.METHOD_NOT_ALLOWED,
          "Backfill API is disabled on this service. You'll need to call the other beefy backfill endpoint");
    }
  }

  @Post(
      uri = "/classificationSummary",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<ClassificationSummaryRow> classificationSummary(@Body ModelMetricsRqst rqst)
      throws SQLException {
    ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);

    ValidateRequest.checkTooGranular(rqst.getInterval(), rqst.getGranularity());
    return datasetMetricsService.classificationSummary(rqst);
  }

  @Post(
      uri = "/classificationMetrics",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<ClassificationMetricRow> classificationMetrics(@Body ModelMetricsRqst rqst)
      throws SQLException {
    ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);
    ValidateRequest.checkTooGranular(rqst.getInterval(), rqst.getGranularity());
    return datasetMetricsService.classificationMetrics(rqst);
  }

  @Post(
      uri = "/regressionMetrics",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<RegressionMetricRow> regressionMetrics(@Body ModelMetricsRqst rqst)
      throws SQLException {
    ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);
    ValidateRequest.checkTooGranular(rqst.getInterval(), rqst.getGranularity());
    return datasetMetricsService.regressionMetrics(rqst);
  }

  /**
   * spotless:off
     * Return max count for input and output features.
     * Implements one version of the `getBatchMetadataByTimeRangeQuery` dashbird  query.
     *
     * @param rqst - specification of filtering criteria
     * @return List of MaxIORow structs
     * timestamp	    isOutput	maxCount
     * 1672272000000	0	        2834
     * 1672272000000	1	        2834
     * <p>
     * spotless:on
   */
  @Post(
      uri = MAX_IO_ENDPOINT,
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<MaxIORow> maxIO(@Body MaxIORequest rqst) {
    List<MaxIORow> resp = cache.check(rqst, MAX_IO_ENDPOINT);
    if (resp != null) {
      return resp;
    }
    ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);
    resp = metricsService.queryMaxIO(rqst);
    if (resp != null && resp.size() > 0) {
      cache.write(rqst, resp, MAX_IO_ENDPOINT);
    }

    return resp;
  }

  @Post(
      uri = MAX_IO_SEGMENTED_ENDPOINT,
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<MaxIORowSegmented> maxIOSegmented(@Body MaxIoSegmentedRequest rqst) {
    if (rqst.getDisableCache() != null && rqst.getDisableCache()) {
      return metricsService.queryMaxIOSegmented(rqst);
    }
    List<MaxIORowSegmented> resp = cache.check(rqst, MAX_IO_SEGMENTED_ENDPOINT);
    if (resp != null) {
      return resp;
    }

    // Try the pre-rendered cache table first
    try {
      ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);
      resp = metricsService.queryMaxIOSegmentedCacheTable(rqst);
    } catch (Exception e) {
      log.error("Exception trying to hit the pre-rendered cache table");
    }

    if (resp == null || resp.isEmpty()) {
      // Fall back to hitting the big table
      resp = metricsService.queryMaxIOSegmented(rqst);
    }

    if (resp != null && resp.size() > 0) {
      cache.write(rqst, resp, MAX_IO_SEGMENTED_ENDPOINT);
    }

    return resp;
  }

  @Post(
      uri = "/deleteProfileRequests",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void requestProfileDeletion(@Body DeleteProfileRequest deleteProfileRequest) {
    val r =
        DeleteProfile.builder()
            .request(deleteProfileRequest)
            .creationTimestamp(System.currentTimeMillis())
            .updatedTimestamp(System.currentTimeMillis())
            .status(DeletionStatus.PENDING)
            .build();
    val id = profileDeletionRepository.persistToPostgres(r);

    if (!deleteProfileRequest.getReingestAfterDeletion()) {
      r.setId(id);
      profileDeletionRepository.persistToS3(r);
    }
  }

  @Post(
      uri = "/deleteProfileRequests/preview",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DataDeletionPreviewResponse requestProfileDeletionPreview(
      @Body DeleteProfileRequest deleteProfileRequest) {
    if (deleteProfileRequest.getBeforeUploadTs() != null) {
      throw new UnsupportedOperationException(
          "Previewing deletion prior to an upload timestamp is not yet supported");
    }
    return profileService.deletePreview(deleteProfileRequest);
  }

  @Get(uri = "/deleteProfileRequests/{orgId}", produces = MediaType.APPLICATION_JSON)
  public List<DeleteProfile> getRecentProfileDeletionRequests(@PathVariable String orgId) {
    return profileDeletionRepository.getRecentRequests(orgId);
  }

  @Get(uri = "/deleteProfileRequests/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public List<DeleteProfile> getRecentProfileDeletionRequests(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return profileDeletionRepository.getRecentRequests(orgId, datasetId);
  }

  @Put(uri = "/deleteProfileRequests/cancel/{id}", produces = MediaType.APPLICATION_JSON)
  public void cancelProfileDeletionRequests(@PathVariable Integer id) {
    val p = profileDeletionRepository.findById(id);
    if (p.isPresent() && p.get().getStatus().equals(DeletionStatus.PENDING)) {
      profileDeletionRepository.cancelRequest(p.get().getId());
      profileDeletionRepository.clearRequestFromS3(p.get());
    } else if (!p.isPresent()) {
      throw new HttpStatusException(HttpStatus.NOT_FOUND, "id not found");
    } else {
      throw new HttpStatusException(
          HttpStatus.FORBIDDEN, "Unable to cancel request that is " + p.get().getStatus());
    }
  }

  @Post(uri = "/traces/list", produces = MediaType.APPLICATION_JSON)
  public GetTracesResponse listTraces(@Body GetTracesRequest request) {
    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());
    if (request.getInterval() == null && request.getTraceId() == null) {
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "Must provide either interval or traceId in request");
    }
    return profileService.listTraces(request);
  }

  @Post(uri = "/traces/segment/list", produces = MediaType.APPLICATION_JSON)
  public GetTracesBySegmentResponse listTracesBySegment(@Body GetTracesBySegmentRequest request) {
    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());
    if (request.getInterval() == null) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide either interval");
    }
    return profileService.listTracesBySegment(request);
  }

  @Post(uri = "/audit/list", produces = MediaType.APPLICATION_JSON)
  public List<ProfileAuditEntryResponse> listAudit(@Body GetProfileAuditEntries request) {
    return profileService.listAudit(request);
  }

  /**
   * Return aggregated profile metrics.
   *
   * <p>Profiles from a single model are aggregated by time and bucketed according to `granularity`.
   * Metrics are filtered by `columnNames`, `interval`, and one of either `segment` or `segmentKey`.
   * `traceId` may further filter metrics from profiles with that specific traceId value.
   * `profileId` is only used by retrieval-tokens to show metrics from a single individual profile.
   *
   * <p>`fractions`, `numBins`, and `splitPoints` affect how kll sketches are converted to
   * histograms in post-aggregation.
   */
  @Put(uri = ROLLUP_ENDPOINT, produces = MediaType.APPLICATION_JSON)
  public List<ModelRollup> profileRollup(@Body ProfileRollupRequest prr) {
    ValidateRequest.checkMaintenanceWindow(prr.getInterval(), globalStatusService);
    retrievalTokenService.apply(prr);

    ValidateRequest.checkTooGranular(prr.getInterval(), prr.getGranularity());
    ValidateRequest.checkGranularTableQuery(
        prr.getInterval(), prr.getGranularity(), prr.getTraceId(), prr.getColumnNames());

    if (Optional.ofNullable(prr.getColumnNames()).map(List::size).orElse(0)
        > 100) { // Maybe make this value an application config
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "Must provide no more than 100 column names");
    }
    if (isNull(prr.getOrgId())
        || prr.getOrgId().isEmpty()
        || isNull(prr.getDatasetId())
        || prr.getDatasetId().isEmpty()) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide org_id and dataset");
    }
    if (prr.getSplitPoints() != null && prr.getNumBins() != null) {
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "Cannot accept both 'splitPoints' and 'numBins'");
    }
    if (prr.getSplitPoints() != null) {
      val p = prr.getSplitPoints();
      boolean monotonic = IntStream.range(1, p.size()).allMatch(i -> p.get(i - 1) < p.get(i));
      if (!monotonic) {
        throw new HttpStatusException(
            HttpStatus.BAD_REQUEST, "Splitpoints must all be unique and monotonically increasing");
      }
    }
    try {
      List<ModelRollup> resp = cache.check(prr, ROLLUP_ENDPOINT);
      if (resp != null) {
        return resp;
      }

      resp = profileService.rollup(prr);
      if (resp != null && resp.size() > 0) {
        cache.write(prr, resp, ROLLUP_ENDPOINT);
      }
      return resp;
    } catch (SQLException sqlException) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, sqlException.getMessage());
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  @Post(uri = "/getReferenceProfileSketches/", produces = MediaType.APPLICATION_JSON)
  public List<ModelRollup> getReferenceProfileSketches(@Body ReferenceProfileRequest rqst) {
    if (rqst.getOrgId().isEmpty() || rqst.getDatasetId().isEmpty()) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide org_id and dataset");
    } else if (rqst.getReferenceProfileId().isEmpty()) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide reference_id");
    }

    try {
      return profileService.getReferenceProfileSketches(rqst);
    } catch (Exception e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, getRootCause(e).getMessage());
    }
  }

  @Get(uri = "/segments/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  @Deprecated // Use POST getSegments(SegmentsRequest rqst)
  public List<String> getSegments(@PathVariable String orgId, @PathVariable String datasetId) {
    log.debug("get segments");
    return modelService.getSegments(orgId, datasetId, false, SegmentRequestScope.TIMESERIES, null);
  }

  @Post(uri = "/segments", produces = MediaType.APPLICATION_JSON)
  public List<String> getSegments(@Body SegmentsRequest rqst) {
    log.debug("get segments {}", rqst);
    if (rqst.getOrgId().isEmpty() || rqst.getDatasetId().isEmpty()) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide orgId and datasetId");
    }
    return modelService.getSegments(
        rqst.getOrgId(),
        rqst.getDatasetId(),
        rqst.isIncludeHidden(),
        rqst.getScope(),
        rqst.getFilter());
  }

  @Put(uri = "/segments/hide", produces = MediaType.APPLICATION_JSON)
  public void hideSegment(@Body HideSegmentRequest rqst) {
    log.debug("get segments");
    if (rqst.getOrgId().isEmpty() || rqst.getDatasetId().isEmpty() || rqst.getSegment().isEmpty()) {
      throw new HttpStatusException(
          HttpStatus.BAD_REQUEST, "Must provide orgId and datasetId and segment");
    }
    legacySegmentRepository.hideSegment(rqst.getOrgId(), rqst.getDatasetId(), rqst.getSegment());
  }

  @Post(
      uri = "/numericMetricsForTimeRange/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<ModelRollup> getNumericMetricsForTimeRange(
      @Body NumericMetricsForTimeRangeRequest request) {
    ValidateRequest.checkTooGranular(request.getInterval(), request.getGranularity());
    ValidateRequest.checkMaintenanceWindow(request.getInterval(), globalStatusService);

    try {
      return profileService.getNumericMetricsForTimeRange(request);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @Post(
      uri = "/numericMetricsForSegmentKey/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<ModelRollup> getNumericMetricsForSegmentKey(
      @Body NumericMetricsForSegmentKeyRequest request) {
    ValidateRequest.checkMaintenanceWindow(
        new Interval(request.getInterval()), globalStatusService);
    try {
      return profileService.getNumericMetricsForSegmentKey(request);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  /** Force data promotion from staging=>historical hypertables */
  @Post(
      uri = "/forcePromote/{async}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void forcePromote(@PathVariable boolean async) {
    try {
      profileService.promoteHistoricalData(async, DEFAULT_PROMOTION_LOOKBACK_DAYS, false);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  /** Unit testing only, force a data promotion * */
  @Post(
      uri = "/forcePromote/{async}/{dayThreshold}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void forcePromote(@PathVariable boolean async, @PathVariable int dayThreshold) {
    try {
      profileService.promoteHistoricalData(async, dayThreshold, false);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  /**
   * For unit tests
   *
   * @param orgId
   * @param datasetId
   */
  @Post(
      uri = "/forcePromote/individual/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void forcePromote(@PathVariable String orgId, @PathVariable String datasetId) {
    profileService.promoteHistoricalData(orgId, datasetId);
  }

  /** Unit testing only, update profile data to put a trace id in place * */
  @Put(
      uri = "/traceId/populate/{orgId}/{datasetId}/{traceId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void populateTraceId(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String traceId) {
    profileService.populateTraceId(orgId, datasetId, traceId);
  }

  /** For debugging this diagnostic helper query */
  @Post(
      uri = "/metricSegments/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<String> metricSegments(@Body MetricSegmentsRequest rqst) {

    return profileService.metricSegments(
        rqst.getOrgId(),
        rqst.getDatasetId(),
        rqst.getInterval(),
        rqst.getColumnName(),
        rqst.getMetricPath());
  }

  @Post(
      uri = "/deleteProfileRequests/runNow",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DeletionReport deleteProfilesRunNow() {
    profileDeletionRepository.markPendingRequestsAsProcessing();
    val requests = profileDeletionRepository.getInProgressRequests();
    for (val r : requests) {
      profileService.delete(r.getRequest());
      profileDeletionRepository.markProcessingRequestsAsCompleted(r.getId());
    }
    return DeletionReport.builder().deletionRequestsRan(requests.size()).build();
  }

  @Post(
      uri = "/tagList/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public TagListResponse paginatedSegmentTagList(@Body TagListRequest rqst) {
    return profileService.listTagKeyValues(rqst);
  }

  @Post(
      uri = "/schema/infer",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public EntitySchema inferEntitySchema(@Body InferSchemaRequest rqst) {
    return profileService.inferEntitySchema(rqst);
  }

  @Post(
      uri = "/schema/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public ai.whylabs.core.configV3.structure.EntitySchema entitySchema(
      @Body ProfileReadRequest rqst) {
    log.debug("infer profile schema: {}", rqst);

    return profileService.getEntitySchema(rqst.getFile());
  }

  @Post(
      uri = "/schema/publish",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void publishEntitySchema(@Body ProfileReadRequest rqst) {
    log.debug("publish profile schema: {}", rqst);

    profileService.publishEntitySchema(rqst.getFile());
  }

  @Post(
      uri = "/indexFromCloudTrail",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.TEXT_PLAIN)
  public String reindexCloudTrail(@Body ReindexFromCloudTrailRequest rqst) throws SQLException {
    log.debug("Index profile from CloudTrail archive: {}", rqst);

    profileService.replay(rqst);
    return "OK";
  }

  /**
   * force ingestion of pending rows in the audit table. Under normal circumstances pending profiles
   * are automatically ingested in a regular schedule. This endpoint may be needed for debugging or
   * testing.
   */
  @Post(
      uri = "/ingestPending",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.TEXT_PLAIN)
  public String ingestPending(@Body IngestPendingRequest rqst) {
    log.debug("Ingest pending rows from audit table: {}", rqst);
    profileService.ingestPending();
    return "OK";
  }

  /**
   * Helper endpoint for unit testing - gets ingestion state associated with a specific file. This
   * is not used in the normal course of business.
   */
  @Post(
      uri = "/getIngestState",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public AuditRow.IngestState getIngestState(@Body ProfileReadRequest readFileRequest) {
    return profileService.getIngestState(readFileRequest.getFile());
  }

  @Post(
      uri = INSIGHTS_SINGLE,
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<InsightEntry> singleProfileInsight(@Body GetSingleProfileInsights rqst) {
    val cachedResult = cache.<List<InsightEntry>>check(rqst, INSIGHTS_SINGLE);
    if (cachedResult != null) {
      log.debug("Returning cached result for {}", rqst);
      return cachedResult;
    }

    val result = insightsService.getSingleProfileInsights(rqst);
    if (result != null && result.size() > 0) {
      cache.write(rqst, result, INSIGHTS_SINGLE);
    }

    return result;
  }

  @Post(
      uri = INSIGHTS_SINGLE_COUNT,
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public Long countSingleProfileInsight(@Body GetSingleProfileInsights rqst) {
    val cachedResult = cache.<BigInteger>check(rqst, INSIGHTS_SINGLE_COUNT);
    if (cachedResult != null) {
      log.debug("Returning cached result for {}", rqst);
      return cachedResult.longValue();
    }
    ValidateRequest.checkMaintenanceWindow(rqst.getInterval(), globalStatusService);
    val result = insightsService.countInsight(rqst);
    if (result != null && result.longValueExact() > 0) {
      cache.write(rqst, result, INSIGHTS_SINGLE_COUNT);
    }
    return result.longValue();
  }

  @Post(
      uri = "/numericMetricByProfile/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<NumericMetricByProfileResponse> getNumericMetricByProfile(
      @Body NumericMetricByProfile request) {
    ValidateRequest.checkMaintenanceWindow(request.getInterval(), globalStatusService);

    try {
      return profileService.getNumericMetricByProfile(request);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @Post(
      uri = "/numericMetricByProfile/download/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public String downloadNumericMetricByProfile(@Body NumericMetricByProfile request) {
    log.info("downloadNumericMetricByProfile {}", request);
    ValidateRequest.checkMaintenanceWindow(request.getInterval(), globalStatusService);

    try {
      return profileService.downloadNumericMetricByProfile(request);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @Post(
      uri = "/numericMetricByReference/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<NumericMetricByProfileResponse> getNumericMetricByReference(
      @Body NumericMetricByReference request) {

    try {
      return profileService.getNumericMetricByReference(request);
    } catch (SQLException e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @Post(
      uri = "/activeColumns/",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<String> getActiveColumns(@Body ColumnNameListRequest request) {

    try {
      ValidateRequest.checkMaintenanceWindow(request.getInterval(), globalStatusService);
      return profileService.getActiveColumns(request);
    } catch (Exception e) {
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, getRootCause(e).getMessage());
    }
  }

  // For unit test purposes only, grab how large tables are
  @Get(uri = "/getTableSizes", produces = MediaType.APPLICATION_JSON)
  public TableSizesResponse getTableSizes() {
    return TableSizesResponse.builder().counts(profileService.getTableSizes()).build();
  }

  /**
   * Re-upload data in this dataset with a timestamp offset in the future enabling you to copy old
   * data into a more recent timeboundary. This is helpful on two fronts:
   *
   * <p>1) Data ages out after 5 years 2) When demo-ing its really helpful to have the most recent
   * couple months populated for all demo datasets
   */
  @Post(
      uri = "/copyDemoData",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void copy(@Body CopyDemoData request) {
    profileService.cloneDemoData(
        request.getOrgId(),
        request.getDatasetId(),
        request.getInterval().getStartMillis(),
        request.getInterval().getEndMillis(),
        request.getOffsetDays());
  }
}

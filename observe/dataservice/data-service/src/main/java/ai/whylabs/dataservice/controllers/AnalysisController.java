package ai.whylabs.dataservice.controllers;

import ai.whylabs.adhoc.AdHocAnalyzerRunnerV3;
import ai.whylabs.adhoc.BackfillExplanationRunner;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.adhoc.structures.BackfillExplainerRequest;
import ai.whylabs.adhoc.structures.BackfillExplainerResponse;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.structures.AnalyzerRun;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.adhoc.AsyncRequestDispatcher;
import ai.whylabs.dataservice.adhoc.PostgresDataResolver;
import ai.whylabs.dataservice.enums.DeletionStatus;
import ai.whylabs.dataservice.models.MonitorAndAnomalyCount;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.*;
import ai.whylabs.dataservice.services.*;
import ai.whylabs.dataservice.sinks.AdhocV3ResultPostgresSink;
import ai.whylabs.dataservice.structures.DeleteAnalyzerResult;
import ai.whylabs.dataservice.util.SegmentUtils;
import ai.whylabs.dataservice.util.ValidateRequest;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import javax.inject.Inject;
import javax.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
@Tag(name = "Analysis", description = "Various analysis endpoints")
@Controller("/analysis")
@RequiredArgsConstructor
public class AnalysisController {
  @Inject private AnalysisService analysisService;
  @Inject private final PostgresDataResolver postgresDataResolver;
  @Inject private final AdHocAnalyzerRunnerV3 adHocAnalyzerRunnerV3;
  @Inject private final BackfillExplanationRunner backfillExplanationRunner;
  @Inject private final IndexerService indexerService;
  @Inject private AdhocV3ResultPostgresSink postgresAdhocSink;
  @Inject private final AnalyzerResultDeletionRepository analyzerResultDeletionRepository;
  @Inject private DataSvcConfig config;
  @Inject private AnalyzerRunRepository analyzerRunRepository;
  @Inject private AdminService adminService;
  @Inject private AsyncRequestDispatcher asyncRequestDispatcher;
  @Inject private EntitySchemaService entitySchemaService;

  @Get(uri = "/{id}", produces = MediaType.APPLICATION_JSON)
  public Optional<AnalyzerResultResponse> getById(@PathVariable UUID id) {
    return analysisService.findById(id.toString());
  }

  @Get(uri = "/analysisId/{id}", produces = MediaType.APPLICATION_JSON)
  public Optional<AnalyzerResultResponse> findByAnalysisId(@PathVariable UUID id) {
    return analysisService.findByAnalysisId(id.toString());
  }

  @Post(
      uri = "/runAnalyzer",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public AdHocMonitorResponse triggerV3AnalyzerPostgres(@Body AdHocMonitorRequestV3 request) {
    log.debug("Trigger v3 analyzer PG");
    return adHocAnalyzerRunnerV3.run(
        request, postgresAdhocSink, postgresDataResolver, UUID.randomUUID().toString(), false);
  }

  @Post(
      uri = "/getAnalyzerResults",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<AnalyzerResultResponse> getAnalyzerResults(@Body GetAnalyzerResultRequest request) {
    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());
    request.setSegments(SegmentUtils.reorderSegmentTags(request.getSegments()));
    ValidateRequest.checkNotNull(request.getInterval(), GetAnalyzerResultRequest.Fields.interval);
    return analysisService.getAnalyzerResults(request);
  }

  @Post(
      uri = "/getAnomalyCounts",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<GetAnomalyCountsResult> getAnomalyCountsQuery(@Body GetAnomalyCountsRequest request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), GetAnomalyCountsRequest.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), GetAnomalyCountsRequest.Fields.monitorIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), GetAnomalyCountsRequest.Fields.analyzerIds);

    request.setSegments(SegmentUtils.reorderSegmentTags(request.getSegments()));
    request.setExcludeSegments(SegmentUtils.reorderSegmentTags(request.getExcludeSegments()));
    ValidateRequest.checkDisjoint(
        request.getSegments(),
        request.getExcludeSegments(),
        GetAnomalyCountsRequest.Fields.segments);
    ValidateRequest.checkNotNull(request.getInterval(), GetAnomalyCountsRequest.Fields.interval);

    return analysisService.getAnomalyCounts(request);
  }

  @Post(
      uri = "/getLatestAnomalyQuery",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<GetLatestAnomalyResponse> getLatestAnomalyQuery(@Body GetLatestAnomalyQuery request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), GetLatestAnomalyQuery.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), GetLatestAnomalyQuery.Fields.monitorIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), GetLatestAnomalyQuery.Fields.analyzerIds);
    request.setSegments(SegmentUtils.reorderSegmentTags(request.getSegments()));
    ValidateRequest.checkNotNull(request.getInterval(), GetLatestAnomalyQuery.Fields.interval);

    return analysisService.getLatestAnomalyQuery(request);
  }

  /**
   * Return list of count of anomalies, grouped by segment, sored by that count descendingly.
   *
   * @param request org and datasets to look for, along with time range
   * @return list of counts of anomalies
   */
  @Post(
      uri = "/getSegmentAnomalyCounts",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<GetSegmentAnomalyCountsResponse> getSegmentAnomalyCounts(
      @Body GetSegmentAnomalyCountsRequest request) {
    ValidateRequest.checkNotNull(request.getOrgId(), GetSegmentAnomalyCountsRequest.Fields.orgId);
    ValidateRequest.checkNotNull(
        request.getDatasetId(), GetSegmentAnomalyCountsRequest.Fields.datasetId);
    ValidateRequest.checkNotNull(
        request.getInterval(), GetSegmentAnomalyCountsRequest.Fields.interval);
    return analysisService.getSegmentAnomalyCounts(request);
  }

  @Post(
      uri = "/monitors/list",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<MonitorAndAnomalyCount> listMonitors(ListMonitorsRequest request) {
    return analysisService.listMonitors(request);
  }

  @Post(
      uri = "/getAlertCountsOverTime",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<GetAlertsOverTimeResponse> getAlertCountsOverTime(
      @Body GetAlertsOverTimeRequest request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), GetAlertsOverTimeRequest.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getRunIds(), GetAlertsOverTimeRequest.Fields.runIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), GetAlertsOverTimeRequest.Fields.analyzerIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), GetAlertsOverTimeRequest.Fields.monitorIds);
    ValidateRequest.checkFilterListSize(
        request.getColumnNames(), GetAlertsOverTimeRequest.Fields.columnNames);
    request.setSegments(SegmentUtils.reorderSegmentTags(request.getSegments()));
    ValidateRequest.checkNotNull(request.getInterval(), GetAlertsOverTimeRequest.Fields.interval);

    return analysisService.getAlertCountsOverTime(request);
  }

  @Post(
      uri = "/getAlertCountsOverTimeSegmented",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public SegmentedGetAlertsOverTimeResponse getAlertCountsOverTimeSegmented(
      @Body GetAlertCountsOverTimeSegmented request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), GetAlertsOverTimeRequest.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getRunIds(), GetAlertsOverTimeRequest.Fields.runIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), GetAlertsOverTimeRequest.Fields.analyzerIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), GetAlertsOverTimeRequest.Fields.monitorIds);
    request.setSegments(SegmentUtils.reorderSegmentTags(request.getSegments()));
    ValidateRequest.checkNotNull(request.getInterval(), GetAlertsOverTimeRequest.Fields.interval);

    return analysisService.getAlertCountsOverTimeSegmented(request);
  }

  @Post(
      uri = "/runBackfillExplainer",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public BackfillExplainerResponse backfillExplain(@Body BackfillExplainerRequest request) {
    log.debug("Run backfilll explainer");

    return backfillExplanationRunner.run(request);
  }

  @Deprecated // This is overlapped by more parameterized endpoints ^
  @Get(uri = "/anomalies/recent/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public List<AnalyzerResultResponse> getRecentAnomalies(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return analysisService.getRecentAnomalies(orgId, datasetId);
  }

  @Post(
      uri = "/runs/getAdHocRunNumEvents",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public GetAdHocRunNumEventsResponse getAdHocRunNumEvents(
      @Body GetAdHocRunNumEventsRequest request) {
    return analysisService.getAdHocRunNumEvents(request);
  }

  /** mark anomalies as unhelpful which hides an alert from the UI. */
  @Put(uri = "/markUnhelpful/{status}/{id}", produces = MediaType.APPLICATION_JSON)
  public void markUnhelpful(@PathVariable boolean status, @PathVariable String id) {
    analysisService.markUnhelpful(id, status);
  }

  /**
   * Queue request to delete analyzer results.
   *
   * <p>Delete analyzer results for a single orgid/modelid filtered by <i>dataset_timestamp</i>
   * within the (`delete_gte`, `delete_lt`] in epoch milliseconds. Results will be deleted from
   * deltalake when the monitor cluster next runs; results will be deleted from postgres at the top
   * of the hour.
   */
  @Post(
      uri = "/deleteAnalysisRequests",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void requestAnalysisDeletion(@Body DeleteAnalysisRequest deleteAnalysisRequest) {
    val r =
        DeleteAnalyzerResult.builder()
            .request(deleteAnalysisRequest)
            .creationTimestamp(System.currentTimeMillis())
            .updatedTimestamp(System.currentTimeMillis())
            .status(DeletionStatus.PENDING)
            .build();
    val id = analyzerResultDeletionRepository.persistToPostgres(r);
    r.setId(id);
    analyzerResultDeletionRepository.persistToS3(r);
  }

  /**
   * Preview delete analyzer results request.
   *
   * <p>Returns information about how many analyzer results would be deleted if a request were
   * executed. Previews deletion request for a single orgid/modelid filtered by
   * <i>dataset_timestamp</i> within the (`delete_gte`, `delete_lt`] in epoch milliseconds.
   * Technically this only reports data for results in postgres, but results from the deltalake
   * should be identical.
   */
  @Post(
      uri = "/deleteAnalysisRequests/preview",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DataDeletionPreviewResponse requestAnalysisDeletionPreview(
      @Body DeleteAnalysisRequest deleteAnalysisRequest) {
    return analysisService.deletePreview(deleteAnalysisRequest);
  }

  @Get(uri = "/deleteAnalysisRequests/{orgId}", produces = MediaType.APPLICATION_JSON)
  public List<DeleteAnalyzerResult> getRecentAnalysisDeletionRequests(@PathVariable String orgId) {
    return analyzerResultDeletionRepository.getRecentRequests(orgId);
  }

  /** Returns a list of PENDING and COMPLETED requests to delete analyzer results. */
  @Get(uri = "/deleteAnalysisRequests/{orgId}/{datasetId}", produces = MediaType.APPLICATION_JSON)
  public List<DeleteAnalyzerResult> getRecentAnalysisDeletionRequests(
      @PathVariable String orgId, @PathVariable String datasetId) {
    return analyzerResultDeletionRepository.getRecentRequests(orgId, datasetId);
  }

  /**
   * Cancels a pending delete analyzer request from Postgres.
   *
   * <p>`id` maybe obtained from `GET /deleteAnalysisRequests/{orgId}/{datasetId}`.
   */
  @Put(uri = "/deleteAnalysisRequests/cancel/{id}", produces = MediaType.APPLICATION_JSON)
  public void cancelAnalysisDeletionRequest(@PathVariable Integer id) {
    val p = analyzerResultDeletionRepository.findById(id);
    if (p.isPresent() && p.get().getStatus().equals(DeletionStatus.PENDING)) {
      analyzerResultDeletionRepository.cancelRequest(p.get().getId());
      analyzerResultDeletionRepository.clearRequestFromS3(p.get());
    } else if (!p.isPresent()) {
      throw new HttpStatusException(HttpStatus.NOT_FOUND, "id not found");
    } else {
      throw new HttpStatusException(
          HttpStatus.FORBIDDEN, "Unable to cancel request that is " + p.get().getStatus());
    }
  }

  /**
   * Experimental endpoint for copying adhoc results over to the main tables. TBD if we want to
   * expand on this flow, but it makes unit tests easier to write and unlock some hackathon ideas.
   *
   * @param runId
   */
  @Post(uri = "/promoteAdhocResults/{runId}", produces = MediaType.APPLICATION_JSON)
  public void promoteAdhocResults(@PathVariable String runId) {
    val schema = adminService.getTableSchema(AnalysisService.ADHOC);
    analysisService.promoteAdhocResults(schema, runId, null, null, new CountDownLatch(1));
  }

  @Post(uri = "/ingestBulkResults", consumes = MediaType.TEXT_PLAIN)
  @Transactional
  public void ingestBulkResults(@Body String rows) {
    if (rows.isEmpty()) {
      throw new HttpStatusException(HttpStatus.BAD_REQUEST, "Must provide rows to ingest");
    }

    try {
      indexerService.ingestBulkResults(rows);
    } catch (SQLException | IOException e) {
      log.error("Caught exception bulk ingesting analyzer results", e);
      throw new HttpStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }
  }

  @Post(
      uri = "/runs/count",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public CountAnalyzerRunResult getAnalyzerRunCount(@Body CountAnalyzerRunRequest request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), CountAnalyzerRunRequest.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), CountAnalyzerRunRequest.Fields.monitorIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), CountAnalyzerRunRequest.Fields.analyzerIds);

    return analyzerRunRepository.countAnalyzerRuns(request);
  }

  @Post(
      uri = "/runs/list",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<AnalyzerRun> getAnalyzerRuns(@Body GetAnalyzerRunsRequest request) {
    ValidateRequest.checkFilterListSize(
        request.getDatasetIds(), CountAnalyzerRunRequest.Fields.datasetIds);
    ValidateRequest.checkFilterListSize(
        request.getMonitorIds(), CountAnalyzerRunRequest.Fields.monitorIds);
    ValidateRequest.checkFilterListSize(
        request.getAnalyzerIds(), CountAnalyzerRunRequest.Fields.analyzerIds);

    ValidateRequest.checkLimitOffset(request.getLimit(), request.getOffset());
    return analyzerRunRepository.listAnalyzerRuns(request);
  }

  @Post(
      uri = "/calculator/targetBucketBoundary",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public BucketCalculationResponse getTargetBucketBoundary(@Body BucketCalculationRequest request) {
    val ts = ZonedDateTime.ofInstant(Instant.ofEpochMilli(request.getTs()), ZoneOffset.UTC);
    val g = request.getGranularity().asMonitorGranularity();
    val startOfTargetBatch = ComputeJobGranularities.truncateTimestamp(ts, g);
    val endOfTargetBatch = ComputeJobGranularities.add(startOfTargetBatch, g, 1);
    return BucketCalculationResponse.builder()
        .start(startOfTargetBatch.toInstant().toEpochMilli())
        .end(endOfTargetBatch.toInstant().toEpochMilli())
        .build();
  }

  /**
   * Immediately execute any pending delete analyzer results requests for Postgres.
   *
   * <p>Note this does not affect pending delete request for the deltalake.
   */
  @Post(
      uri = "/deleteAnalysisRequests/runNow",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DeletionReport deleteAnalysisRunNow() {
    analyzerResultDeletionRepository.markPendingRequestsAsProcessing();
    val requests = analyzerResultDeletionRepository.getInProgressRequests();
    for (val r : requests) {
      analysisService.delete(r.getRequest());
      analyzerResultDeletionRepository.markProcessingRequestsAsCompleted(r.getId());
    }
    return DeletionReport.builder().deletionRequestsRan(requests.size()).build();
  }

  /**
   * Evaluate analyzer target metrix behavior against profile info. For example a profile has a
   * specific set of tags. Given a target matrix config, what segments would be analyzed?
   */
  @Post(
      uri = "/targetMatrixEvaluator",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public EvaluateTargetMatrixResponse targetMatrixEvaluator(
      @Body EvaluateTargetMatrixRequest request) {
    List<ai.whylabs.core.configV3.structure.Tag> segmentTags = new ArrayList<>();

    val response = EvaluateTargetMatrixResponse.builder();
    if (request.getProfileTags() != null) {
      for (val t : request.getProfileTags()) {
        segmentTags.add(
            ai.whylabs
                .core
                .configV3
                .structure
                .Tag
                .builder()
                .key(t.getKey())
                .value(t.getValue())
                .build());
      }

      val matchedSegments =
          MatchingSegmentFactory.getApplicableSegmentsForProfile(
              Arrays.asList(Analyzer.builder().targetMatrix(request.getTargetMatrix()).build()),
              segmentTags);
      response.segments(matchedSegments.keySet());
    }

    if (request.getOrgId() != null && request.getDatasetId() != null) {
      GetEntitySchemaRequest r = new GetEntitySchemaRequest();
      r.setOrgId(request.getOrgId());
      r.setDatasetId(request.getDatasetId());
      r.setIncludeHidden(false);

      EntitySchema entitySchema = entitySchemaService.getWithCaching(r);
      val featurePredicate = new FeaturePredicate();
      val a = new Analyzer();
      a.setTargetMatrix(request.getTargetMatrix());
      Set<String> columns = new HashSet<>();
      if (entitySchema != null && entitySchema.getColumns() != null) {
        for (val entrySet : entitySchema.getColumns().entrySet()) {
          val c = entrySet.getKey();

          // TODO: Plumb feature weights into data service so we can provide those here
          if (featurePredicate.test(a, entitySchema.getColumns().get(c), c, 1.0)) {
            columns.add(entrySet.getKey());
          }
        }
        response.columns(columns);
      }
    }

    return response.build();
  }

  /**
   * Return total number of digests recorded in Postgres.
   *
   * <p>Currently this is only used by unit tests to verify correct generation of immediate digests.
   */
  @Post(
      uri = "/countDigests",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public long getDigests(@Body GetDigestsRequest request) {
    return analysisService.countDigests(request);
  }
}

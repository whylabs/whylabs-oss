package ai.whylabs.dataservice.adhoc;

import static java.util.Objects.isNull;

import ai.whylabs.adhoc.AdHocAnalyzerRunnerV3;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.predicatesV3.inclusion.BatchCooldownPredicate;
import ai.whylabs.core.predicatesV3.inclusion.FeaturePredicate;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.predicatesV3.segment.OverallSegmentPredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.enums.FailureType;
import ai.whylabs.dataservice.enums.SegmentRequestScope;
import ai.whylabs.dataservice.requests.*;
import ai.whylabs.dataservice.responses.GetFeatureWeightsResponse;
import ai.whylabs.dataservice.services.*;
import ai.whylabs.dataservice.sinks.AdhocV3ResultPostgresSink;
import ai.whylabs.dataservice.sinks.MainTableV3PGResultsPostgresSink;
import ai.whylabs.dataservice.sinks.MainTableV3ResultsPostgresSink;
import ai.whylabs.dataservice.util.DatasourceConstants;
import ai.whylabs.dataservice.util.MonitorConfigUtil;
import ai.whylabs.dataservice.util.NativeQueryHelper;
import ai.whylabs.dataservice.util.SegmentUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.collect.Lists;
import io.micrometer.core.instrument.MeterRegistry;
import io.micronaut.context.annotation.Executable;
import io.micronaut.context.annotation.Value;
import io.micronaut.data.annotation.Repository;
import io.micronaut.http.annotation.Body;
import io.micronaut.scheduling.annotation.Async;
import io.micronaut.transaction.annotation.TransactionalAdvice;
import java.sql.*;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import javax.sql.DataSource;
import javax.transaction.Transactional;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.joda.time.Instant;
import org.joda.time.Interval;
import org.postgresql.jdbc.PgArray;

@Slf4j
@Singleton
@RequiredArgsConstructor
@Repository
public class AsyncRequestDispatcher {

  @Inject
  @Named(DatasourceConstants.BULK)
  private DataSource bulkDatasource;

  @Inject private final MeterRegistry meterRegistry;
  @Inject private final ObjectMapper mapper;

  @Inject
  @Named(DatasourceConstants.STANDBY)
  private DataSource standbyDatasource;

  @Inject
  @Named(DatasourceConstants.READONLY)
  private DataSource roDatasource;

  @Inject private AnalysisService analysisService;

  @Inject private AdminService adminService;

  @Inject private EntitySchemaService entitySchemaService;
  @Inject private ModelService modelService;
  @Inject private AdHocAnalyzerRunnerV3 adHocAnalyzerRunnerV3;
  @Inject private AdhocV3ResultPostgresSink postgresAdhocSink;
  @Inject private MainTableV3ResultsPostgresSink mainTableV3ResultsPostgresSink;
  @Inject private MainTableV3PGResultsPostgresSink mainTableV3PGResultsPostgresSink;
  @Inject private PostgresDataResolver postgresDataResolver;
  @Inject private PostgresDataResolverAdhoc postgresDataResolverAdhoc;
  @Inject private PostgresDataResolverPgMonitor postgresDataResolverPgMonitor;
  @Inject private MonitorConfigService monitorConfigService;
  @Inject private final DataSvcConfig serviceConfig;

  @Inject private NotificationService notificationService;
  @Inject private final DatasetService datasetService;
  @Inject private FeatureWeightsService featureWeightsService;

  private AtomicInteger dispatchesInFlight = new AtomicInteger();
  private static final Integer PROMOTION_PARALELLISM = 20;

  private Cache<String, AsyncRequest> REQUEST_CACHE =
      CacheBuilder.newBuilder().expireAfterWrite(1, TimeUnit.MINUTES).maximumSize(1000).build();

  @Value("${queue-user}")
  private String queueUser;

  private static final String DEPLOYED_QUEUE_USER = "dataservice";

  /** Debug/Unit tests only */
  public void runInline(String runId) {
    AsyncRequest request = getByRunId(runId);
    request.setNumAttempts(0l);
    request.setEligableToRun(System.currentTimeMillis());
    planExecution(request);
    dispatchWork(request.getQueue(), 100);
  }

  public void runInline(AsyncAdhocRequest request) {
    String runId = queueUpAsyncRequest(request);
    AsyncRequest r = getByRunId(runId);
  }

  public void retry(String runId) {
    AsyncRequest request = getByRunId(runId);
    request.setNumAttempts(0l);
    request.setEligableToRun(System.currentTimeMillis());
    updateStatus(StatusEnum.PENDING, runId, "", null);
  }

  private static final Long retryIntervalMillis = 60 * 60 * 1000l;

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void requeueWithDelay(AsyncRequest request) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "update whylabs.adhoc_async_requests set eligable_to_run = now() + interval '1 hours', num_attempts = num_attempts + 1 where id = ?");
    pst.setLong(1, request.getId());
    pst.executeUpdate();
  }

  /**
   * We can't anticipate every possible bug, so we mark requests as canceled if they've been sitting
   * there for over a day
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void reapStuckRequests() {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "update whylabs.adhoc_async_requests set updated_timestamp = now(), failure_type = 'timed_out_planning', failure_message = 'Timeout during planning phase', status = 'CANCELED', tasks = 0, tasks_complete = 0 where  created_timestamp < now() - interval '24 hours' and (status = 'PENDING'::adhoc_async_status_enum or status = 'EXECUTING'::adhoc_async_status_enum ) and (eligable_to_run is null or eligable_to_run < now() - interval '24 hours')");
    pst.executeUpdate();
  }

  @Async("async-adhoc-planner")
  public void planExecutionAsync(AsyncRequest req, CountDownLatch latch) {
    try {
      planExecution(req);
    } catch (Exception e) {
      log.info("Unable to plan async adhoc query runId {}", req.getRunId(), e);
      updateStatus(
          StatusEnum.FAILED, req.getRunId(), e.getMessage(), FailureType.query_planning_failure);
    } finally {
      latch.countDown();
    }
  }

  /**
   * Break up the request by column+segment combination. We have an inverted index on
   * org/dataset/column/segment, so I theorize that makes for a good fanout. Lotta small queries
   * rather than a few big ones will avoid unexpected query plans.
   */
  @SneakyThrows
  public void planExecution(AsyncRequest request) {
    if (!validateAsyncRequest(request)) return;

    updateStatus(StatusEnum.PLANNING, request.getRunId(), "", null);
    GetEntitySchemaRequest r = new GetEntitySchemaRequest();
    r.setOrgId(request.getOrgId());
    r.setDatasetId(request.getDatasetId());
    r.setIncludeHidden(false);

    EntitySchema entitySchema = entitySchemaService.getWithCaching(r);
    if (entitySchema == null) {
      log.trace(
          "No entity schema present for {}, {}. Unable to queue up work",
          request.getOrgId(),
          request.getDatasetId());
      updateStatus(
          StatusEnum.FAILED,
          request.getRunId(),
          "Entity schema not present for this dataset, unable to plan work",
          FailureType.missing_entity_schema);
      return;
    }
    if (entitySchema.getColumns().size() > 11000) {
      updateStatus(
          StatusEnum.FAILED,
          request.getRunId(),
          "Entity schema has surpassed 11k columns indicating either a logging issue or the need to clean up some unused features from entity schema",
          FailureType.unbound_entity_schema);
      return;
    }
    Map<String, ColumnSchema> columns = new HashMap<>();
    if (request.getColumns() != null && request.getColumns().size() > 0) {
      for (val c : request.getColumns()) {
        columns.put(c, entitySchema.getColumns().get(c));
      }
    } else {
      columns.putAll(entitySchema.getColumns());
    }

    List<String> segments;

    if (request.getSegmentList() != null) {
      List<String> tags = mapper.readValue(request.getSegmentList(), List.class);
      segments = Arrays.asList(StringUtils.join(SegmentUtils.reorderSegmentTags(tags), "&"));
    } else {
      segments =
          modelService.getSegments(
              request.getOrgId(),
              request.getDatasetId(),
              false,
              SegmentRequestScope.TIMESERIES,
              null);
    }

    val featureWeights =
        featureWeightsService.loadCached(request.getOrgId(), request.getDatasetId());
    List<AnalysisQueueEntry> partitionedQueueEntries =
        createWorkQueueEntries(request, segments, columns, featureWeights);

    // Tally up how many segments are being analyzed
    Set<Segment> uniqueSegments = new HashSet<>();
    for (val e : partitionedQueueEntries) {
      if (e.getSegments() != null) {
        uniqueSegments.addAll(e.getSegments());
      }
    }
    int uniqueSegmentCount = uniqueSegments.size();

    Set<String> uniqueColumns = new HashSet<>();
    for (val e : partitionedQueueEntries) {
      uniqueColumns.add(e.getColumnName());
    }

    /**
     * Not every analyzer has work to do. For example if it only targets a column not in the
     * dataset, there's nothing to analyze.
     */
    if (partitionedQueueEntries.size() > 0) {
      // Write to queue
      persistWorkerQueueEntries(partitionedQueueEntries, request);

      // Update status
      updateStatus(StatusEnum.EXECUTING, request.getRunId(), "", null);
      updateTaskCounts(request.getRunId(), partitionedQueueEntries.size(), 0l);

      val conf =
          monitorConfigService.getMonitorConfigCached(request.getOrgId(), request.getDatasetId());
      String analyzerType = MonitorConfigUtil.getAnalyzerType(conf, request.getAnalyzerId());
      String monitorId = MonitorConfigUtil.getMonitorId(conf, request.getAnalyzerId());
      updateMetadataAndStats(
          request.getRunId(), uniqueColumns, uniqueSegmentCount, analyzerType, monitorId);
    } else {
      updateStatus(StatusEnum.SUCCESSFUL, request.getRunId(), "", null);
    }
  }

  private Cache<String, Granularity> DATASET_GRANULARITY_CACHE =
      CacheBuilder.newBuilder().expireAfterWrite(5, TimeUnit.MINUTES).maximumSize(20000).build();

  /**
   * Dataset granularity rarely changes so we can keep a pretty long cache to avoid unecessary
   * config hits to the database for fetching.
   */
  @SneakyThrows
  private Granularity getGranularityEventuallyConsistent(String orgId, String datasetId) {
    String cacheKey = orgId + datasetId;
    return DATASET_GRANULARITY_CACHE.get(
        cacheKey,
        () -> {
          val conf = monitorConfigService.getMonitorConfigCached(orgId, datasetId);
          return conf.getGranularity();
        });
  }

  /**
   * returns true if request is valid and model has all prerequisites for running analyzers, false
   * otherwise.
   *
   * <p>Validation may reschedule async request for a later time.
   */
  private boolean validateAsyncRequest(AsyncRequest request) {
    val dataset = datasetService.getDataset(request.getOrgId(), request.getDatasetId());
    if (dataset != null && !dataset.getActive()) {
      updateStatus(
          StatusEnum.FAILED,
          request.getRunId(),
          "Dataset has been marked inactive, analysis will be skipped",
          FailureType.dataset_inactive);
      return false;
    }

    meterRegistry.counter("whylabs.monitor.execution_planning").increment();
    if (request.getQueue().equals(AsyncAnalysisQueue.scheduled)) {
      val i = Interval.parse(request.getBackfillInterval());
      val lastUpload =
          modelService.getMostRecentUploadTimestamp(request.getOrgId(), request.getDatasetId(), i);
      val target =
          ZonedDateTime.ofInstant(
              java.time.Instant.ofEpochMilli(i.getStart().toInstant().getMillis()), ZoneOffset.UTC);

      for (val analyzer :
          MonitorConfigV3JsonSerde.parseAnalyzerList(request.getAnalyzersConfigs())) {
        AnalysisMetric metric = null;
        try {
          metric = AnalysisMetric.fromName(analyzer.getMetric());
        } catch (IllegalArgumentException e) {
          updateStatus(
              StatusEnum.FAILED,
              request.getRunId(),
              "Unknown metric " + analyzer.getMetric(),
              FailureType.unknown_metric);
        }

        // generally we don't want to generate events outside the profile lineage, with exceptions
        // for missingDatapoint and secondsSinceLastUpload.

        if (metric.equals(AnalysisMetric.missingDatapoint)
            || metric.equals(AnalysisMetric.secondsSinceLastUpload)) {
          //        if (metric.equals(AnalysisMetric.missingDatapoint)) {
          continue;
        }

        if (lastUpload == null) {
          updateStatus(
              StatusEnum.FAILED,
              request.getRunId(),
              "Data not available, advancing to next bucket",
              FailureType.data_unavailable);
          meterRegistry.counter("whylabs.monitor.data_not_available_sla_miss.").increment();
        }

        if (!new BatchCooldownPredicate(ZonedDateTime.now()).test(lastUpload, analyzer)) {
          // Delay monitoring because datapoint hasn't been uploaded yet or was uploaded within the
          // cooldown period
          requeueWithDelay(request);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * fanout async adhoc request into a list of work queue entries.
   *
   * <p>Each work queue entry is responsible for a single column and a single segment. This routine
   * is purely ministerial and depends on no instance state or PG tables. All state is passed in the
   * parameters.
   */
  @NotNull
  @VisibleForTesting
  static List<AnalysisQueueEntry> createWorkQueueEntries(
      AsyncRequest request,
      List<String> segments,
      Map<String, ColumnSchema> columns,
      GetFeatureWeightsResponse featureWeights) {
    // Figure out what data needs to be resolved
    List<Analyzer> analyzers =
        Arrays.asList(MonitorConfigV3JsonSerde.parseAnalyzerList(request.getAnalyzersConfigs()));

    val featurePredicate = new FeaturePredicate();
    Set<AnalysisQueueEntry> workEntries = new HashSet<>();

    // Create work entries for each of the segments
    for (val s : segments) {
      val segmentTags = SegmentUtils.parseSegmentV3(s);
      for (val a : analyzers) {
        if (request.getAnalyzerId() != null && !request.getAnalyzerId().equals(a.getId())) continue;
        val matchedSegments =
            MatchingSegmentFactory.getApplicableSegments(Arrays.asList(a), segmentTags);

        for (val matchingSegment : matchedSegments.entrySet()) {
          if (matchingSegment.getKey().getTags() == null
              || matchingSegment.getKey().getTags().size() == 0) {
            continue;
          }

          if (a.getTargetMatrix().getClass().isAssignableFrom(DatasetMatrix.class)) {
            val seg = matchingSegment.getKey();
            val workEntry =
                AnalysisQueueEntry.builder()
                    .segments(new HashSet<>(Arrays.asList(seg)))
                    .runId(request.getRunId())
                    .build();
            workEntries.add(workEntry);
          } else if (a.getTargetMatrix().getClass().isAssignableFrom(ColumnMatrix.class)) {
            for (val entrySet : columns.entrySet()) {
              val c = entrySet.getKey();
              val seg = matchingSegment.getKey();
              if (featurePredicate.test(
                  a, columns.get(c), c, SegmentUtils.extractWeight(featureWeights, seg, c))) {
                val workEntry =
                    AnalysisQueueEntry.builder()
                        .segments(new HashSet<>(Arrays.asList(seg)))
                        .columnName(c)
                        .runId(request.getRunId())
                        .build();
                workEntries.add(workEntry);
              }
            }
          } else {
            throw new RuntimeException("Unknown matrix type: " + a.getTargetMatrix());
          }
        }
      }
    }

    // Partition up the work by groups of segments. Balance # of queue entries while protecting from
    // high segment fanout

    Map<String, List<AnalysisQueueEntry>> grouped = new HashMap<>();
    for (val e : workEntries) {
      if (!grouped.containsKey(e.getColumnName())) {
        grouped.put(e.getColumnName(), new ArrayList<>());
      }
      grouped.get(e.getColumnName()).add(e);
    }

    List<AnalysisQueueEntry> partitionedQueueEntries = new ArrayList<>();
    for (val e : grouped.entrySet()) {
      for (val partition : Lists.partition(e.getValue(), 100)) {
        AnalysisQueueEntry workerEntry = null;
        for (val pe : partition) {
          if (workerEntry == null) {
            workerEntry = pe;
          } else {
            workerEntry.merge(pe);
          }
        }
        partitionedQueueEntries.add(workerEntry);
      }
    }

    // Create work entries for overall segment
    if (request.isIncludeOverallSegment()) {
      Set<String> allColumns = new HashSet<>();
      for (val a : analyzers) {
        if (request.getAnalyzerId() != null && !request.getAnalyzerId().equals(a.getId())) continue;
        if (!new OverallSegmentPredicate().containsOverall(a.getTarget().getSegments())) {
          continue;
        }

        if (a.getTargetMatrix().getClass().isAssignableFrom(DatasetMatrix.class)) {
          allColumns.add(null);
        } else if (a.getTargetMatrix().getClass().isAssignableFrom(ColumnMatrix.class)) {
          for (val c : columns.keySet()) {
            if (featurePredicate.test(
                a, columns.get(c), c, SegmentUtils.extractWeight(featureWeights, null, c))) {
              allColumns.add(c);
            }
          }
        } else {
          throw new RuntimeException("Unknown matrix type: " + a.getTargetMatrix());
        }
      }
      allColumns.forEach(
          c ->
              partitionedQueueEntries.add(
                  AnalysisQueueEntry.builder()
                      .segments(null)
                      .columnName(c)
                      .runId(request.getRunId())
                      .build()));
    }
    return partitionedQueueEntries;
  }

  @Async("async-adhoc")
  public void executeWorkEntry(
      AnalysisQueueEntry queueEntry,
      AsyncRequest request,
      Granularity granularity,
      CountDownLatch latch,
      AtomicLong anomalyCounts) {
    meterRegistry.counter("whylabs.monitor.execution_work").increment();
    long start = System.currentTimeMillis();
    try {
      val now = ZonedDateTime.now();

      val analyzers = MonitorConfigV3JsonSerde.parseAnalyzerList(request.getAnalyzersConfigs());
      GetEntitySchemaRequest entitySchemaRequest = new GetEntitySchemaRequest();
      entitySchemaRequest.setOrgId(request.getOrgId());
      entitySchemaRequest.setDatasetId(request.getDatasetId());
      entitySchemaRequest.setIncludeHidden(false);
      EntitySchema entitySchema = entitySchemaService.getWithCaching(entitySchemaRequest);
      val config =
          monitorConfigService.getMonitorConfigCached(request.getOrgId(), request.getDatasetId());
      config.setAnalyzers(Arrays.asList(analyzers));
      config.setEntitySchema(entitySchema);

      val i = Interval.parse(request.getBackfillInterval());

      List<AdHocMonitorRequestV3> reqs = new ArrayList<>();
      boolean enableDatasetLevelAnalysis = false;
      for (val a : analyzers) {
        if (a.getTargetMatrix() != null
            && a.getTargetMatrix().getClass().isAssignableFrom(DatasetMatrix.class)) {
          enableDatasetLevelAnalysis = true;
        }
      }

      val adHocMonitorRequestV3 =
          AdHocMonitorRequestV3.builder()
              .monitorConfig(config)
              .columnNames(Arrays.asList(queueEntry.getColumnName()))
              .ignoreBackfillGracePeriodLimit(true)
              .start(i.getStart().toString())
              .end(i.getEnd().toString())
              .inlineResults(false)
              .enableDatasetLevelAnalysis(enableDatasetLevelAnalysis);
      if (request.getQueue().equals(AsyncAnalysisQueue.scheduled) && serviceConfig.isDeployed()) {
        adHocMonitorRequestV3.notifySiren(true);
      }

      if (queueEntry.getSegments() != null) {
        for (val segment : queueEntry.getSegments()) {
          reqs.add(adHocMonitorRequestV3.segmentTags(Arrays.asList(segment.getTags())).build());
        }
      } else {
        // Overall segment
        reqs.add(adHocMonitorRequestV3.build());
      }
      for (val r : reqs) {
        // Manually triggered backfills replace existing analyzer results, everything else is insert
        // only
        AdHocMonitorResponse response = null;
        // boolean skipDeletes = !request.getQueue().equals(AsyncAnalysisQueue.on_demand);
        boolean skipDeletes = false;
        switch (request.getDestination()) {
          case ANALYSIS_HYPERTABLES:
            response =
                adHocAnalyzerRunnerV3.run(
                    r,
                    mainTableV3ResultsPostgresSink,
                    postgresDataResolver,
                    queueEntry.getRunId(),
                    skipDeletes);
            break;
          case ADHOC_TABLE:
            response =
                adHocAnalyzerRunnerV3.run(
                    r, postgresAdhocSink, postgresDataResolverAdhoc, queueEntry.getRunId(), true);
            break;
          case ANALYSIS_HYPERTABLES_PG:
            response =
                adHocAnalyzerRunnerV3.run(
                    r,
                    mainTableV3PGResultsPostgresSink,
                    postgresDataResolverPgMonitor,
                    queueEntry.getRunId(),
                    skipDeletes);
            break;
        }

        anomalyCounts.addAndGet(new Long(response.numAnomalies));
      }
    } finally {
      latch.countDown();
    }
  }

  /**
   * @return true if there's more work to do
   */
  @SneakyThrows
  @Transactional(rollbackOn = Exception.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public Integer dispatchWork(AsyncAnalysisQueue queue, int parallelism) {
    ResultSet r = null;
    @Cleanup Connection db = bulkDatasource.getConnection();

    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "DELETE FROM  whylabs."
                + queue.toTable()
                + "  WHERE id = any (\n"
                + "            SELECT id FROM whylabs."
                + queue.toTable()
                + " where queue_user is null or queue_user = ? FOR UPDATE SKIP LOCKED \n"
                + "    LIMIT "
                + parallelism
                + ") RETURNING id, run_id, column_name, segments");
    pst.setString(1, queueUser);
    pst.execute();
    r = pst.getResultSet();

    List<AnalysisQueueEntry> queueEntries = new ArrayList<>();
    while (r.next()) {
      val aqe =
          AnalysisQueueEntry.builder()
              .id(r.getLong("id"))
              .runId(r.getString("run_id"))
              .columnName(r.getString("column_name"));
      val segmentString = r.getString("segments");
      if (!StringUtils.isEmpty(segmentString)) {
        aqe.segments(
            new HashSet<>(Arrays.asList(mapper.readValue(segmentString, Segment[].class))));
      }
      queueEntries.add(aqe.build());
    }
    if (queueEntries.size() == 0) {
      return 0;
    }

    val latch = new CountDownLatch(queueEntries.size());
    Map<String, Integer> taskCounts = new HashMap<>();
    Map<String, AtomicLong> anomalyCounts = new HashMap<>();

    for (val queueEntry : queueEntries) {
      AsyncRequest asyncRequest = getByRunIdCached(queueEntry.getRunId());
      if (taskCounts.containsKey(queueEntry.getRunId())) {
        taskCounts.put(queueEntry.getRunId(), taskCounts.get(queueEntry.getRunId()) + 1);
      } else {
        taskCounts.put(queueEntry.getRunId(), 1);
      }
      if (!anomalyCounts.containsKey(queueEntry.getRunId())) {
        anomalyCounts.put(queueEntry.getRunId(), new AtomicLong());
      }

      // Notable the actual work is async, so LIMIT 10 on the query ^ lets us kick off 10 worker
      // threads with only a single connection tied up holding onto a transaction
      executeWorkEntry(
          queueEntry,
          asyncRequest,
          getGranularityEventuallyConsistent(asyncRequest.getOrgId(), asyncRequest.getDatasetId()),
          latch,
          anomalyCounts.get(queueEntry.getRunId()));
    }

    // Update task counters
    if (latch.await(5, TimeUnit.MINUTES)) {
      for (val q : taskCounts.entrySet()) {
        incrementTaskCompleteCount(
            q.getKey(), q.getValue(), anomalyCounts.get(q.getKey()).longValue());
      }
    } else {
      for (val e : queueEntries) {
        AsyncRequest asyncRequest = getByRunIdCached(e.getRunId());
        log.warn(
            "Timed out out waiting for async work queue entry. RunId {}, requeueing entries",
            e.getRunId());
        persistWorkerQueueEntries(Arrays.asList(e), asyncRequest);
      }
    }
    return queueEntries.size();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public String queueUpAsyncRequest(AsyncAdhocRequest request) {
    DestinationEnum destination = DestinationEnum.ADHOC_TABLE;
    if (request.getQueue().equals(AsyncAnalysisQueue.backfill)
        || request.getQueue().equals(AsyncAnalysisQueue.scheduled)) {
      destination = DestinationEnum.ANALYSIS_HYPERTABLES_PG;
    } else if (request.getQueue().equals(AsyncAnalysisQueue.on_demand)) {
      if (request.isPromoteResults()) {
        destination = DestinationEnum.ANALYSIS_HYPERTABLES;
      }
    }

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "insert into whylabs.adhoc_async_requests (org_id, dataset_id, destination, analyzers_configs, run_id, status, backfill_interval, queue, eligable_to_run) values (?, ?, ?::adhoc_async_destination_enum, ?::jsonb, gen_random_uuid(), 'PENDING'::adhoc_async_status_enum, ?, ?::async_analysis_queue, now() -interval '1 hours') returning run_id");
    pst.setString(1, request.getOrgId());
    pst.setString(2, request.getDatasetId());
    pst.setObject(3, destination.name(), Types.VARCHAR);
    pst.setString(4, request.getAnalyzers());
    pst.setString(5, request.getInterval().toString());
    pst.setString(6, request.getQueue().name());
    val response = pst.executeQuery();
    response.next();
    return response.getString(1);
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  // The query threads take a while to wrap up, so we don't wanna block the cancel request for a
  // long time
  @Async("async-adhoc")
  public void cancelAsyncRequest(String runId) {
    @Cleanup Connection db = bulkDatasource.getConnection();

    for (val table : AsyncAnalysisQueue.values()) {
      @Cleanup
      PreparedStatement pst2 =
          db.prepareStatement("delete from whylabs." + table.toTable() + " where run_id = ?");
      pst2.setString(1, runId);
      pst2.execute();
    }

    @Cleanup
    PreparedStatement pst3 =
        db.prepareStatement("delete from whylabs.adhoc_async_promotion_queue where run_id = ?");
    pst3.setString(1, runId);
    pst3.execute();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void persistWorkerQueueEntries(
      List<AnalysisQueueEntry> queueEntries, AsyncRequest asyncRequest) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "insert into whylabs."
                + asyncRequest.getQueue().toTable()
                + " (run_id, column_name, segments, queue_user) values (?, ?, ?, ?)");

    for (val q : queueEntries) {
      String segmentList = null;
      if (q.getSegments() != null) {
        segmentList =
            mapper.writeValueAsString(q.getSegments().stream().collect(Collectors.toList()));
      }

      pst.setString(1, asyncRequest.getRunId());
      pst.setString(2, q.getColumnName());

      pst.setObject(3, segmentList);
      pst.setString(4, queueUser);

      pst.addBatch();
    }
    pst.executeBatch();
  }

  // The call's pretty quick, but we get some row contention due to counter increments across
  // threads
  @SneakyThrows
  public AsyncRequest getByRunIdCached(String runId) {
    return REQUEST_CACHE.get(runId, () -> getByRunId(runId));
  }

  public AsyncRequest getByRunId(String runId) {
    val a = new GetAsyncRequests();
    a.setRunId(runId);
    val l = queryAsyncRequestsConsistent(a);
    if (l.size() > 0) {
      return l.get(0);
    }
    return null;
  }

  @TransactionalAdvice(DatasourceConstants.BULK)
  public List<AsyncRequest> queryAsyncRequestsConsistent(GetAsyncRequests query) {
    return queryAsyncRequests(query, bulkDatasource);
  }

  @TransactionalAdvice(DatasourceConstants.READONLY)
  public List<AsyncRequest> queryAsyncRequestsEventuallyConsistent(GetAsyncRequests query) {
    return queryAsyncRequests(query, roDatasource);
  }

  @Executable
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  public List<AsyncRequest> queryAsyncRequests(GetAsyncRequests query, DataSource datasource) {
    String q =
        "select id, org_id, dataset_id, status::text, destination::text, analyzers_configs::text, tasks, tasks_complete, run_id, backfill_interval, features, segments, columns, all_monitor_run, eligable_to_run, num_attempts, analyzer_id, queue::text, failure_type, segment_list, include_overall_segment, anomalies, analyzer_type, monitor_id from whylabs.adhoc_async_requests where ";
    List<String> clauses = new ArrayList<>();
    List<String> sub = new ArrayList<>();
    if (query.getOrgId() != null) {
      clauses.add("org_id = ?");
      sub.add(query.getOrgId());
    }
    if (query.getDatasetId() != null) {
      clauses.add("dataset_id = ?");
      sub.add(query.getDatasetId());
    }
    if (query.getRunId() != null) {
      clauses.add("run_id = ?");
      sub.add(query.getRunId());
    }
    if (query.getOnlyActive() != null && query.getOnlyActive()) {
      clauses.add("status in ('PENDING', 'PLANNING', 'EXECUTING', 'WRITING_RESULTS')");
    }
    if (query.getQueue() != null) {
      clauses.add("queue = '" + query.getQueue() + "'::async_analysis_queue");
    }

    String sql =
        q
            + StringUtils.join(clauses.toArray(), " and ")
            + " order by created_timestamp desc limit "
            + query.getLimit()
            + " offset "
            + query.getOffset();
    @Cleanup Connection db = datasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(sql);
    for (int x = 0; x < sub.size(); x++) {
      pst.setString(x + 1, sub.get(x));
    }

    val r = pst.executeQuery();
    List<AsyncRequest> requests = new ArrayList<>();
    while (r.next()) {
      val b =
          AsyncRequest.builder()
              .id(r.getLong("id"))
              .orgId(r.getString("org_id"))
              .datasetId(r.getString("dataset_id"))
              .status(StatusEnum.valueOf(r.getString("status")))
              .destination(DestinationEnum.valueOf(r.getString("destination")))
              .analyzersConfigs(r.getString("analyzers_configs"))
              .tasks(r.getLong("tasks"))
              .tasksComplete(r.getLong("tasks_complete"))
              .runId(r.getString("run_id"))
              .backfillInterval(r.getString("backfill_interval"))
              .features(r.getLong("features"))
              .segments(r.getLong("segments"))
              .numAttempts(r.getLong("num_attempts"))
              .analyzerId(r.getString("analyzer_id"))
              .segmentList(r.getString("segment_list"))
              .includeOverallSegment(r.getBoolean("include_overall_segment"))
              .anomalies(r.getLong("anomalies"))
              .analyzerType(r.getString("analyzer_type"))
              .monitorId(r.getString("monitor_id"))
              .columns(NativeQueryHelper.fromArray((PgArray) r.getObject("columns")));
      val eligableToRun = r.getTimestamp("eligable_to_run");
      if (eligableToRun != null) {
        b.eligableToRun(eligableToRun.toInstant().toEpochMilli());
      }
      val failureType = r.getString("failure_type");
      if (failureType != null) {
        b.failureType(FailureType.valueOf(failureType));
      }
      val queue = r.getString("queue");
      if (queue != null) {
        b.queue(AsyncAnalysisQueue.valueOf(r.getString("queue")));
      } else {
        b.queue(AsyncAnalysisQueue.on_demand);
      }
      requests.add(b.build());
    }
    return requests;
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public int countActiveOnDemandRequests(String orgId) {
    String q =
        "select count(*) as c from whylabs.adhoc_async_requests where org_id = ? and status in ( 'PENDING', 'PLANNING', 'EXECUTING', 'WRITING_RESULTS') and queue = 'on_demand'::async_analysis_queue";

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup PreparedStatement pst = db.prepareStatement(q);
    pst.setString(1, orgId);

    val r = pst.executeQuery();
    r.next();
    return r.getInt("c");
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public List<String> getPendingRunIds() {
    @Cleanup Connection db = bulkDatasource.getConnection();

    String sql =
        "select run_id from whylabs.adhoc_async_requests where status = 'PENDING' and (eligable_to_run is null or eligable_to_run < ?::timestamptz + interval '1 seconds' or queue = 'on_demand'::async_analysis_queue) limit 100";

    @Cleanup PreparedStatement pst = db.prepareStatement(sql);
    pst.setTimestamp(1, getReplicationLagCutoffStandby());
    val r = pst.executeQuery();
    List<String> runIds = new ArrayList<>();
    while (r.next()) {
      runIds.add(r.getString(1));
    }
    return runIds;
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void updateStatus(
      StatusEnum status, String runId, String message, FailureType failureType) {
    val asyncRequest = getByRunIdCached(runId);
    meterRegistry.counter("whylabs.monitor.status_change." + status).increment();
    meterRegistry
        .counter("whylabs.monitor.queue." + asyncRequest.getQueue() + ".status_change." + status)
        .increment();

    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "update  whylabs.adhoc_async_requests  set status = ?::adhoc_async_status_enum, failure_message = ?, failure_type = ? where run_id = ?");
    pst.setString(1, status.name());
    pst.setString(2, message);
    if (failureType == null) {
      pst.setObject(3, null, Types.VARCHAR);
    } else {
      pst.setString(3, failureType.name());
    }

    pst.setString(4, runId);
    pst.executeUpdate();

    // send alerts for successful scheduled workloads
    if (!asyncRequest.getQueue().equals(AsyncAnalysisQueue.scheduled)
        || !status.equals(StatusEnum.SUCCESSFUL)) return;

    val conf =
        monitorConfigService.getMonitorConfigCached(
            asyncRequest.getOrgId(), asyncRequest.getDatasetId());
    for (val m : conf.getMonitors()) {
      if (!m.getAnalyzerIds().contains(asyncRequest.getAnalyzerId())) continue;
      if (isNull(m.getMode())) continue;
      if (m.getMode().getClass().equals(DigestMode.class)) {
        notificationService.sendDigest(
            asyncRequest.getOrgId(),
            asyncRequest.getDatasetId(),
            m,
            asyncRequest.getRunId(),
            Interval.parse(asyncRequest.getBackfillInterval()));
        break;
      }
      if (m.getMode().getClass().equals(EveryAnamolyMode.class)) {
        notificationService.sendEveryAnomaly(
            asyncRequest.getOrgId(),
            asyncRequest.getDatasetId(),
            m,
            asyncRequest.getRunId(),
            Interval.parse(asyncRequest.getBackfillInterval()));
        break;
      }
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void updateTaskCounts(String runId, long tasks, long tasksComplete) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "update  whylabs.adhoc_async_requests  set tasks = ?, tasks_complete = ? where run_id = ?");
    pst.setLong(1, tasks);
    pst.setLong(2, tasksComplete);
    pst.setString(3, runId);
    pst.executeUpdate();
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void updateMetadataAndStats(
      String runId, Set<String> columns, long segments, String analyzerType, String monitorId) {
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "update  whylabs.adhoc_async_requests  set features = ?, segments = ?, columns = ?::varchar[], analyzer_type = ?, monitor_id = ? where run_id = ?");
    pst.setLong(1, columns.size());
    pst.setLong(2, segments);
    pst.setObject(3, NativeQueryHelper.toArray(db, new ArrayList<>(columns)), Types.ARRAY);
    pst.setString(4, analyzerType);
    pst.setObject(5, monitorId, Types.VARCHAR);
    pst.setString(6, runId);
    pst.executeUpdate();
  }

  @Async("async-adhoc") // Imperfect if we loose a machine, but the count being off isn't the end of
  // the world. Trying to cut down on lock contention across threads.
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void incrementTaskCompleteCount(String runId, Integer amount, Long anomalyCount) {
    // Update the tasks counts based on how many are left in the queue
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement updateRemainingTaskCounts =
        db.prepareStatement(
            "update  whylabs.adhoc_async_requests  set  tasks_complete = tasks_complete + ?, anomalies = ? where run_id = ? returning tasks, tasks_complete, backfill_interval");
    updateRemainingTaskCounts.setInt(1, amount);
    updateRemainingTaskCounts.setLong(2, anomalyCount);
    updateRemainingTaskCounts.setString(3, runId);
    val r = updateRemainingTaskCounts.executeQuery();

    while (r.next()) {
      if (r.getInt(1) == r.getInt(2)) {
        updateStatus(StatusEnum.SUCCESSFUL, runId, "", null);
      }
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.READONLY)
  @Executable
  public void publishQueueDepthMetrics() {
    @Cleanup Connection db = roDatasource.getConnection();

    for (val t : AsyncAnalysisQueue.values()) {
      @Cleanup
      PreparedStatement taskCount =
          db.prepareStatement("select count(*) from whylabs." + t.toTable());
      val r = taskCount.executeQuery();
      while (r.next()) {
        meterRegistry.gauge("whylabs.monitor.queue." + t + ".depth", r.getLong(1));
      }
    }
    @Cleanup
    PreparedStatement taskCount =
        db.prepareStatement(
            "select count(*) from whylabs.adhoc_async_requests where status = 'EXECUTING'");
    val r = taskCount.executeQuery();
    while (r.next()) {
      meterRegistry.gauge("whylabs.monitor.state.executing", r.getLong(1));
    }

    @Cleanup
    PreparedStatement stuckTaskCount =
        db.prepareStatement(
            "select count(*) from whylabs.adhoc_async_requests where status = 'EXECUTING' and  updated_timestamp + interval '12 hours' < now()");
    val stuckTaskResult = stuckTaskCount.executeQuery();
    while (stuckTaskResult.next()) {
      meterRegistry.gauge("whylabs.monitor.state.stuckExecuting", stuckTaskResult.getLong(1));
    }

    @Cleanup
    PreparedStatement columnsNewArrivalQueueSize =
        db.prepareStatement("select pg_total_relation_size('whylabs.columns_new_arrival_queue')");
    val columnArivalQueueResult = stuckTaskCount.executeQuery();
    while (columnArivalQueueResult.next()) {
      meterRegistry.gauge(
          "whylabs.monitor.columnstat.promotion.queue.size", columnArivalQueueResult.getLong(1));
    }
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public String triggerBackfill(@Body BackfillRequest request, MonitorConfigV3 conf) {
    List<Analyzer> analyzers = new ArrayList<>();
    if (request.getAnalyzerIds() != null && request.getAnalyzerIds().size() > 0) {
      for (val a : conf.getAnalyzers()) {
        if (request.getAnalyzerIds().contains(a.getId())) {
          analyzers.add(a);
        }
      }
    } else {
      analyzers.addAll(conf.getAnalyzers());
    }
    if (analyzers.size() == 0) {
      return null;
    }

    val r = new AsyncAdhocRequest();
    r.setOrgId(request.getOrgId());
    r.setDatasetId(request.getDatasetId());
    r.setAnalyzers(MonitorConfigV3JsonSerde.MAPPER.get().writeValueAsString(analyzers));
    r.setPromoteResults(true);
    r.setInterval(request.getInterval());
    r.setQueue(request.getQueue());
    log.debug("Triggering async backfill for org {}, dataset {}", r.getOrgId(), r.getDatasetId());
    return queueUpAsyncRequest(r);
  }

  /** Replication lag metrics */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.BULK)
  @Executable
  public void updateReplicationLagTracer() {
    // Update the tasks counts based on how many are left in the queue
    @Cleanup Connection db = bulkDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement("update  whylabs.repl_lag set last_updated_timestamp = ?");
    pst.setTimestamp(1, new Timestamp(Instant.now().getMillis()));
    pst.executeUpdate();
  }

  /**
   * updateReplicationLagTracer runs on the PG master setting the timestamp to now() every second.
   * We can query the replica for this timestamp to know how far behind on replication we are. This
   * can be handy for delaying analysis on data that's still in wal transit.
   */
  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.STANDBY)
  @Executable
  public Timestamp getReplicationLagCutoffStandby() {
    // Update the tasks counts based on how many are left in the queue
    @Cleanup Connection db = standbyDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement("select last_updated_timestamp from  whylabs.repl_lag");

    val r = pst.executeQuery();
    while (r.next()) {
      return r.getTimestamp(1);
    }
    return null;
  }

  @SneakyThrows
  @Transactional(rollbackOn = SQLException.class)
  @TransactionalAdvice(DatasourceConstants.STANDBY)
  @Executable
  public void publishStandbyReplicationLagMetric() {
    // Update the tasks counts based on how many are left in the queue
    @Cleanup Connection db = standbyDatasource.getConnection();
    @Cleanup
    PreparedStatement pst =
        db.prepareStatement(
            "select EXTRACT(EPOCH FROM (now() - last_updated_timestamp)) as lag from whylabs.repl_lag");
    val r = pst.executeQuery();
    while (r.next()) {
      long lag = r.getLong(1);
      meterRegistry.gauge("whylabs.postgres.replication.standby", lag);
    }
  }
}

package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.EntitySchema;
import ai.whylabs.dataservice.DataSvcConfig;
import ai.whylabs.dataservice.adhoc.AsyncRequest;
import ai.whylabs.dataservice.adhoc.AsyncRequestDispatcher;
import ai.whylabs.dataservice.adhoc.StatusEnum;
import ai.whylabs.dataservice.enums.AsyncAnalysisQueue;
import ai.whylabs.dataservice.enums.Instance;
import ai.whylabs.dataservice.requests.AsyncAdhocRequest;
import ai.whylabs.dataservice.requests.BackfillRequest;
import ai.whylabs.dataservice.requests.GetAsyncRequests;
import ai.whylabs.dataservice.requests.GetEntitySchemaRequest;
import ai.whylabs.dataservice.services.EntitySchemaService;
import ai.whylabs.dataservice.services.GlobalStatusService;
import ai.whylabs.dataservice.services.MonitorConfigService;
import com.cronutils.utils.Preconditions;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.*;
import io.micronaut.scheduling.annotation.Scheduled;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.Duration;
import org.joda.time.Interval;

@Slf4j
@Tag(name = "Analysis Async", description = "Various analysis endpoints")
@Controller("/analysisAsync")
@RequiredArgsConstructor
public class AsyncAnalysisController {

  @Inject private AsyncRequestDispatcher asyncRequestDispatcher;
  @Inject private MonitorConfigService monitorConfigService;
  @Inject private EntitySchemaService entitySchemaService;
  @Inject private final DataSvcConfig config;
  @Inject private GlobalStatusService globalStatusService;

  /** Most of our contracts state the max backfill is 30d */
  public static final int STANDARD_BACKFILL_CONTRACTUAL_DURATION_DAYS = 30;

  // Kill switch incase we're overwhelming PG and need to make some changes
  @Post(
      uri = "/enable/scheduler/{toggle}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void enableMonitorScheduler(@PathVariable Boolean toggle) {
    globalStatusService.toggleMonitorScheduler(toggle);
  }

  @Post(
      uri = "/enable/workers/{toggle}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void enableWorkers(@PathVariable Boolean toggle) {
    globalStatusService.toggleMonitorWorkers(toggle);
  }

  @Post(uri = "/workers/concurrency/{concurrency}", produces = MediaType.APPLICATION_JSON)
  public void setMonitorWorkerConcurrency(@PathVariable Integer concurrency) {
    globalStatusService.setMonitorWorkerConcurrency(concurrency);
  }

  /**
   * Note: BackfillGracePeriodDuration is till reflected, so don't expect a 3yr backfill to cover
   * 3yrs of data
   */
  @SneakyThrows
  @Post(
      uri = "/triggerBackfill",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public String triggerBackfill(@Body BackfillRequest request) {
    Preconditions.checkArgument(
        countActiveOnDemandRequests(request.getOrgId()) < 1,
        "Cannot run more than backfill concurrently, either wait for the other request to complete or cancel it.");
    if (request.getInterval().toDuration().isLongerThan(Duration.standardDays(365))) {
      log.warn(
          "User attempted to backfill more than a year of data which isn't in anyone's contract yet. Cropping the request {} down to 365 days",
          request);
      request.setInterval(
          new Interval(
              request.getInterval().getEnd().minusDays(365), request.getInterval().getEnd()));
    }

    /**
     * Sitting on the enforcement of contractual restrictions until more discussion after
     * benchmarking GetEntitySchemaRequest re = new GetEntitySchemaRequest();
     * re.setOrgId(request.getOrgId()); re.setDatasetId(request.getDatasetId());
     * re.setIncludeHidden(false);
     *
     * <p>if (request .getInterval() .toDuration()
     * .isLongerThan(Duration.standardDays(STANDARD_BACKFILL_CONTRACTUAL_DURATION_DAYS)) &&
     * entitySchemaService.getWithCaching(re).getColumns().size() > 500) { /** Small models can
     * squeek by with larger backfills. For now (until further discussion) the limits only apply for
     * the big models. Its just too darn usefull of a tool to nerf across the board.
     *
     * <p>request.setInterval( new Interval(
     * request.getInterval().getEnd().minusDays(STANDARD_BACKFILL_CONTRACTUAL_DURATION_DAYS),
     * request.getInterval().getEnd())); }*
     */
    val conf = monitorConfigService.getLatestConf(request.getOrgId(), request.getDatasetId());
    if (conf == null) {
      throw new IllegalStateException(
          "Monitor config came back null for "
              + request.getOrgId()
              + " "
              + request.getDatasetId()
              + ". Backfill unavailable until a monitor config is present.");
    }

    GetEntitySchemaRequest r = new GetEntitySchemaRequest();
    r.setOrgId(request.getOrgId());
    r.setDatasetId(request.getDatasetId());
    r.setIncludeHidden(false);
    EntitySchema entitySchema = entitySchemaService.getWithCaching(r);

    if (entitySchema == null) {
      throw new IllegalStateException(
          "Entity schema came back empty for "
              + request.getOrgId()
              + " "
              + request.getDatasetId()
              + ". Backfill unavailable until entity schema has been created.");
    }

    return asyncRequestDispatcher.triggerBackfill(request, conf);
  }

  /**
   * This is scheduled to run, but in the case of a unit test it can be desired to trigger manually
   */
  @SneakyThrows
  @Get(
      uri = "/triggerQueryPlanner",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void planQueries() {
    if (globalStatusService.monitorWorkerEnabled()
        && (!config.isDeployed() || config.getInstance().equals(Instance.backfill))) {
      List<String> ids = asyncRequestDispatcher.getPendingRunIds();
      CountDownLatch latch = new CountDownLatch(ids.size());
      for (String runId : asyncRequestDispatcher.getPendingRunIds()) {
        AsyncRequest req = asyncRequestDispatcher.getByRunId(runId);
        asyncRequestDispatcher.planExecutionAsync(req, latch);
      }
      latch.await(10, TimeUnit.MINUTES);
    }
  }

  @Scheduled(fixedDelay = "1s")
  public void runAnalysisBatch() {
    if ((!config.isDeployed() || config.getInstance().equals(Instance.monitor))
        && globalStatusService.monitorWorkerEnabled()) {
      Integer concurrency = globalStatusService.getMonitorWorkerConcurrency();
      concurrency =
          concurrency
              - asyncRequestDispatcher.dispatchWork(AsyncAnalysisQueue.scheduled, concurrency - 1);

      concurrency =
          concurrency
              - asyncRequestDispatcher.dispatchWork(AsyncAnalysisQueue.on_demand, concurrency);
      if (concurrency > 0) {
        // Eat your veggies first ^, don't burn any cycles on backfill work until the other queues
        // are drained
        asyncRequestDispatcher.dispatchWork(AsyncAnalysisQueue.backfill, concurrency);
      }
    }
  }

  @Scheduled(fixedDelay = "5s")
  public void publishReplicationLagMetrics() {
    if (config.isDeployed() && config.getInstance().equals(Instance.monitor)) {
      asyncRequestDispatcher.updateReplicationLagTracer();
      asyncRequestDispatcher.publishStandbyReplicationLagMetric();
    }
  }

  @Post(
      uri = "/triggerAnalysis",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public String triggerAsyncV3AnalyzerPostgres(@Body AsyncAdhocRequest request) {
    log.debug("Trigger v3 async analyzer PG");
    return asyncRequestDispatcher.queueUpAsyncRequest(request);
  }

  @Post(
      uri = "/reapStuckRequests",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void reapStuckRequests() {
    asyncRequestDispatcher.reapStuckRequests();
  }

  /**
   * This is for debug/unit testing purposes only. This endpoint WILL time out on a large enough
   * dataset and is not intended for heavy workloads as its not async.
   *
   * @param runId
   */
  @Post(
      uri = "/runAnalysisNow/{runId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void triggerAsyncV3AnalyzerPostgresRunInline(@PathVariable String runId) {
    log.debug("Running v3 async analyzer PG inline");
    asyncRequestDispatcher.runInline(runId);
  }

  @Delete(
      uri = "/triggerAnalysis/cancel/{runId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void cancelAsyncAdhocRequest(@PathVariable String runId) {
    log.debug("Running v3 async analyzer PG inline");
    asyncRequestDispatcher.updateStatus(
        StatusEnum.CANCELED, runId, "Canceled due to user request", null);
    asyncRequestDispatcher.cancelAsyncRequest(runId);
  }

  @Get(
      uri = "/getStatus/{runId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public AsyncRequest getStatus(@PathVariable String runId) {
    return asyncRequestDispatcher.getByRunId(runId);
  }

  @Post(
      uri = "/retry/{runId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public void retry(@PathVariable String runId) {
    asyncRequestDispatcher.retry(runId);
  }

  @Post(
      uri = "/query",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public List<AsyncRequest> queryAsyncRequests(@Body GetAsyncRequests r) {
    if (r.getEnableEventuallyConsistency() != null && r.getEnableEventuallyConsistency()) {
      return asyncRequestDispatcher.queryAsyncRequestsEventuallyConsistent(r);
    } else {
      return asyncRequestDispatcher.queryAsyncRequestsConsistent(r);
    }
  }

  @Get(
      uri = "/countActive/{orgId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public int countActiveOnDemandRequests(@PathVariable String orgId) {
    return asyncRequestDispatcher.countActiveOnDemandRequests(orgId);
  }
}

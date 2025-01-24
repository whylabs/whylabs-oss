package ai.whylabs.dataservice.controllers;

import ai.whylabs.core.configV3.structure.Baselines.ReferenceProfileId;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.predicates.TargetTimeRangePredicateExplodedRow;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.dataservice.diagnostics.AnalysisGateAnalysisRunner;
import ai.whylabs.dataservice.diagnostics.BaselineIntervalResolver;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.DiagnosticRunner;
import ai.whylabs.dataservice.diagnostics.output.CorrelatedAlerts;
import ai.whylabs.dataservice.requests.DiagnosticAnalyzerSegmentColumnsRequest;
import ai.whylabs.dataservice.requests.DiagnosticAnalyzerSegmentsRequest;
import ai.whylabs.dataservice.requests.DiagnosticAnalyzersRequest;
import ai.whylabs.dataservice.requests.GetSegmentAnomalyCountsRequest;
import ai.whylabs.dataservice.responses.DiagnosticAnalyzerGateResponse;
import ai.whylabs.dataservice.responses.DiagnosticAnalyzerSegmentColumnsResponse;
import ai.whylabs.dataservice.responses.DiagnosticAnalyzerSegmentsResponse;
import ai.whylabs.dataservice.responses.DiagnosticAnalyzersResponse;
import ai.whylabs.dataservice.responses.DiagnosticResponse;
import ai.whylabs.dataservice.services.AnalysisService;
import ai.whylabs.dataservice.services.MonitorConfigService;
import ai.whylabs.dataservice.services.ProfileService;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.exceptions.HttpStatusException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.inject.Inject;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;

@Slf4j
@Tag(name = "Diagnostic")
@Controller("/diagnostic")
@RequiredArgsConstructor
public class DiagnosticController {

  @Inject private final MonitorConfigService monitorConfigService;
  @Inject private AnalysisService analysisService;
  @Inject private final ProfileService profileService;

  //

  @Get(
      uri = "/uploadPatterns/{orgId}/{datasetId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DiagnosticAnalyzerGateResponse analyzeUploadPatterns(
      @PathVariable String orgId, @PathVariable String datasetId) {
    val latest = monitorConfigService.getLatest(orgId, datasetId);

    val uploadPattern = profileService.getApproximateUploadLag(orgId, datasetId);
    if (!uploadPattern.isPresent()) {
      throw new HttpStatusException(
          HttpStatus.FAILED_DEPENDENCY,
          "System unable to predict upload patterns based on data present");
    }
    MonitorConfigV3 l = null;
    if (latest.isPresent()) {
      l = MonitorConfigV3JsonSerde.parseMonitorConfigV3(latest.get());
    }
    val runner = new AnalysisGateAnalysisRunner();
    val response = new DiagnosticAnalyzerGateResponse();

    response.setDataReadinessDurationChecks(
        runner.analyzeDataReadinessDuration(
            l, uploadPattern.get().getApproximateUploadLagMinutes()));
    response.setBatchCooldownPeriodChecks(
        runner.analyzeBatchCooldownDuration(
            l, uploadPattern.get().getApproximateUploadWindowMinutes()));
    response.setUploadPattern(uploadPattern.get());
    return response;
  }

  @Get(
      uri = "/run/{orgId}/{datasetId}/{analysisId}",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DiagnosticResponse runDiagnostic(
      @PathVariable String orgId, @PathVariable String datasetId, @PathVariable String analysisId) {
    val analysis = analysisService.findByAnalysisId(analysisId);
    if (!analysis.isPresent()) {
      throw new HttpStatusException(HttpStatus.NOT_FOUND, "id not found");
    }
    val r = new DiagnosticResponse();
    CorrelatedAlerts correlatedAlerts = new CorrelatedAlerts();

    val latest = monitorConfigService.getLatest(orgId, datasetId);

    val timeOf =
        monitorConfigService.getVersioned(
            orgId, datasetId, analysis.get().getMonitorConfigVersion());

    val c = DiagnosticContext.builder();
    c.analysis(analysis.get());
    if (latest.isPresent()) {
      val l = MonitorConfigV3JsonSerde.parseMonitorConfigV3(latest.get());
      c.configLatest(l);
      r.setAnalyzerConfigLatest(c.build().getAnalyzer(l));
    }

    if (timeOf.isPresent()) {
      val timeofConfig = MonitorConfigV3JsonSerde.parseMonitorConfigV3(timeOf.get());
      c.configAtTimeOfAnalysis(MonitorConfigV3JsonSerde.parseMonitorConfigV3(timeOf.get()));
      r.setAnalyzerConfigTimeOfAnalysis(c.build().getAnalyzer(timeofConfig));
      val baseline = c.build().getAnalyzer(timeofConfig).getBaseline();
      if (!ReferenceProfileId.class.isInstance(baseline)) {
        val baselineTimeRange =
            new BaselineIntervalResolver(
                    analysis.get().getDatasetTimestamp(),
                    timeofConfig.getGranularity(),
                    0,
                    baseline,
                    r.getAnalyzerConfigLatest().getTargetSize())
                .getRange();
        val mrt =
            profileService.getMostRecentUploadForRange(
                orgId, datasetId, baselineTimeRange.getLeft(), baselineTimeRange.getRight());
        if (mrt.isPresent()) {
          c.mostRecentTimestampUploadedForBaseline(mrt.get().toInstant().toEpochMilli());
        }

        // Segments check
        Interval baseInterval =
            new Interval(baselineTimeRange.getLeft(), baselineTimeRange.getRight());
        c.baselineSegments(
            profileService.metricSegments(
                orgId, datasetId, baseInterval, analysis.get().getColumn(), "distribution/kll"));
      }
      val targetTimeRange =
          new TargetTimeRangePredicateExplodedRow(
                  ZonedDateTime.ofInstant(
                      Instant.ofEpochMilli(analysis.get().getDatasetTimestamp()), ZoneOffset.UTC),
                  timeofConfig.getGranularity(),
                  0,
                  timeofConfig.isAllowPartialTargetBatches(),
                  analysis.get().getDisableTargetRollup())
              .getRange();

      Interval targetInterval = new Interval(targetTimeRange.getLeft(), targetTimeRange.getRight());
      c.targetSegments(
          profileService.metricSegments(
              orgId, datasetId, targetInterval, analysis.get().getColumn(), "distribution/kll"));

      val mrt =
          profileService.getMostRecentUploadForRange(
              orgId, datasetId, targetTimeRange.getLeft(), targetTimeRange.getRight());
      if (mrt.isPresent()) {
        c.mostRecentTimestampUploadedForTarget(mrt.get().toInstant().toEpochMilli());
      }

      val otherSegmentsAlerting = new GetSegmentAnomalyCountsRequest();
      otherSegmentsAlerting.setOrgId(orgId);
      otherSegmentsAlerting.setDatasetId(datasetId);
      otherSegmentsAlerting.setColumnNames(Arrays.asList(analysis.get().getColumn()));
      otherSegmentsAlerting.setInterval(
          new Interval(targetTimeRange.getLeft(), targetTimeRange.getRight(), DateTimeZone.UTC));
      List<String> alertingSegments = new ArrayList<>();
      for (val s : analysisService.getSegmentAnomalyCounts(otherSegmentsAlerting)) {
        alertingSegments.add(s.getSegment());
      }
      correlatedAlerts.setAlertingSegments(alertingSegments);
    }

    val runner = new DiagnosticRunner(c.build());

    r.setDiagnostics(runner.get());

    r.setAnalysisRan(
        ZonedDateTime.ofInstant(
                Instant.ofEpochMilli(analysis.get().getCreationTimestamp()), ZoneOffset.UTC)
            .toString());
    r.setDatasetTimestamp(
        ZonedDateTime.ofInstant(
                Instant.ofEpochMilli(analysis.get().getDatasetTimestamp()), ZoneOffset.UTC)
            .toString());
    r.setAnalysis(analysis.get());
    r.setCorrelatedAlerts(correlatedAlerts);
    return r;
  }

  /** Returns information helpful in identifying analyzers that may need tuning */
  @Post(
      uri = "/analyzers",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DiagnosticAnalyzersResponse findBadAnalyzers(@Body DiagnosticAnalyzersRequest request) {
    return analysisService.getAnalyzersDiagnostics(request);
  }

  /** Returns information useful in finding problematic segments with a specific analyzer */
  @Post(
      uri = "/analyzer/segments",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DiagnosticAnalyzerSegmentsResponse diagnoseAnalyzerSegments(
      @Body DiagnosticAnalyzerSegmentsRequest request) {
    return analysisService.getAnalyzerSegments(request);
  }

  /**
   * Returns information useful in finding problematic columns in a specific segment and analyzer
   */
  @Post(
      uri = "/analyzer/segment/columns",
      consumes = MediaType.APPLICATION_JSON,
      produces = MediaType.APPLICATION_JSON)
  public DiagnosticAnalyzerSegmentColumnsResponse diagnoseAnalyzerSegmentColumns(
      @Body DiagnosticAnalyzerSegmentColumnsRequest request) {
    return analysisService.getAnalyzerSegmentColumns(request);
  }
}

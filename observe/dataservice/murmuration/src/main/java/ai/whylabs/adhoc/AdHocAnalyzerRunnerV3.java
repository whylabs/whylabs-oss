package ai.whylabs.adhoc;

import ai.whylabs.adhoc.resolvers.DataResolverV3;
import ai.whylabs.adhoc.resultsink.AnalyzerResultSinkV3;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.adhoc.structures.AdHocMonitorResponse;
import ai.whylabs.core.aggregation.AnalyzerResultToExplodedRow;
import ai.whylabs.core.aggregation.ExplodedRowsToAnalyzerResultsV3;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.predicatesV3.inclusion.IndividualProfileAnalyzerPredicate;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.utils.ConfigAwsSdk;
import ai.whylabs.core.validation.MonitorConfigValidationCheck;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class AdHocAnalyzerRunnerV3 {

  @SneakyThrows
  public AdHocMonitorResponse run(
      AdHocMonitorRequestV3 request,
      AnalyzerResultSinkV3 analyzerResultSink,
      DataResolverV3 dataResolver,
      String runId,
      boolean skipDeletes) {

    ZonedDateTime currentTime = ZonedDateTime.now().truncatedTo(ChronoUnit.HOURS);
    if (request.getEnd() != null) {
      currentTime = ZonedDateTime.parse(request.getEnd());
    }

    log.trace("Adhoc request running. RunId {}, CurrentTime {}", runId, currentTime);

    ConfigAwsSdk.defaults();
    val monitorConfigV3 = new MonitorConfigValidationCheck().clean(request.getMonitorConfig());
    removeUnsupportedAnalyzers(monitorConfigV3);

    val analysisGenerator =
        new ExplodedRowsToAnalyzerResultsV3(
            currentTime,
            runId,
            request.getIgnoreBackfillGracePeriodLimit(),
            null,
            new CalculationFactory(),
            ZonedDateTime.parse(request.getStart(), DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                .toInstant()
                .toEpochMilli());
    analysisGenerator.setMonitorConfigV3(monitorConfigV3);
    analysisGenerator.setOrgId(request.getMonitorConfig().getOrgId());
    analysisGenerator.setDatasetId(request.getMonitorConfig().getDatasetId());
    List<ExplodedRow> explodedRows = new ArrayList<>();

    val individualProfilePredicate = new IndividualProfileAnalyzerPredicate();
    AggregationDataGranularity aggregationDataGranularity = AggregationDataGranularity.ROLLED_UP;
    if (individualProfilePredicate.test(monitorConfigV3.getAnalyzers())) {
      aggregationDataGranularity = AggregationDataGranularity.INDIVIDUAL;
    }

    explodedRows.addAll(dataResolver.resolveReferenceProfiles(request));
    explodedRows.addAll(dataResolver.resolveStandardProfiles(request));
    for (val a : dataResolver.resolveAnalyzerResults(request)) {
      explodedRows.add(AnalyzerResultToExplodedRow.to(a));
    }

    // Sort the table the same way EventsJobV3.getExplodedSortedRows() returns it
    explodedRows.sort(getComparator());

    List<AnalyzerResult> results = new ArrayList<>();
    for (val row : explodedRows) {
      val analyzerResults = analysisGenerator.call(row);
      while (analyzerResults.hasNext()) {
        results.add(analyzerResults.next());
      }
    }
    // Simulate end of table
    for (val level : Arrays.asList(TargetLevel.column, TargetLevel.dataset)) {
      val analyzerResults =
          analysisGenerator.call(
              ExplodedRow.builder()
                  .targetLevel(level)
                  .feedbackRow(false)
                  .ingestionMetricRow(false)
                  .rowTerminator(true)
                  .build());
      while (analyzerResults.hasNext()) {
        results.add(analyzerResults.next());
      }
    }

    return sinkAndBuildResponse(
        results, request, runId, monitorConfigV3, currentTime, analyzerResultSink, skipDeletes);
  }

  private AdHocMonitorResponse sinkAndBuildResponse(
      List<AnalyzerResult> results,
      AdHocMonitorRequestV3 request,
      String runId,
      MonitorConfigV3 monitorConfigV3,
      ZonedDateTime currentTime,
      AnalyzerResultSinkV3 analyzerResultSink,
      boolean skipDeletes) {

    val b =
        AdHocMonitorResponse.builder().runId(runId).numEventsProduced(results.size()).success(true);
    if (request.getInlineResults()) {
      b.events(results);
    } else {
      // Sink the results
      analyzerResultSink.publish(request, results, skipDeletes);
    }
    int numAnomalies = 0;
    for (val a : results) {
      if (a.getAnomalyCount() > 0) {
        numAnomalies++;
      }
    }

    b.numEventsProduced(results.size());
    b.numAnomalies(numAnomalies);
    return b.build();
  }

  private void removeUnsupportedAnalyzers(MonitorConfigV3 conf) {
    List<Analyzer> supportedAnalyzers = new ArrayList<>();
    for (val a : conf.getAnalyzers()) {
      if (a.getMetric() != null) {
        supportedAnalyzers.add(a);
      }
    }
    conf.setAnalyzers(supportedAnalyzers);
  }

  /**
   * EventsJobV3 sorts all the exploded rows putting shared columns and segments together. That
   * works in spark but in ad-hoc we have to do it ourselves on a list. This code is emulated here
   * without spark
   *
   * <p>Dataset<ExplodedRow> sorted = exploded .unionAll(terminatorRows)
   * .repartition(col(ExplodedRow.Fields.rowPartition)) .sortWithinPartitions(
   * col(ExplodedRow.Fields.rowTerminator), col(ExplodedRow.Fields.orgId),
   * col(ExplodedRow.Fields.datasetId), col(ExplodedRow.Fields.rowPartition),
   * col(ExplodedRow.Fields.configRow).desc(), col(ExplodedRow.Fields.ingestionMetricRow).asc(),
   * col(ExplodedRow.Fields.segmentText), col(ExplodedRow.Fields.targetLevel),
   * col(ExplodedRow.Fields.columnName), col(ExplodedRow.Fields.feedbackRow),
   * col(ExplodedRow.Fields.ts).desc());
   */
  private Comparator<ExplodedRow> getComparator() {
    return Comparator.nullsLast(
        Comparator.comparing(ExplodedRow::getRowTerminator)
            .thenComparing(ExplodedRow::getOrgId)
            .thenComparing(ExplodedRow::getDatasetId)
            .thenComparing(ExplodedRow::getSegmentText)
            .thenComparing(ExplodedRow::getTargetLevel)
            .thenComparing(ExplodedRow::getColumnName)
            .thenComparing(ExplodedRow::getIngestionMetricRow)
            .reversed()
            .thenComparing(ExplodedRow::getFeedbackRow)
            .thenComparing(ExplodedRow::getTs));
  }
}

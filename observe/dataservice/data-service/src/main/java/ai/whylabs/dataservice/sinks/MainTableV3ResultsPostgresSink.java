package ai.whylabs.dataservice.sinks;

import ai.whylabs.adhoc.resultsink.AnalyzerResultSinkV3;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.adhoc.DestinationEnum;
import ai.whylabs.dataservice.services.AnalysisService;
import java.util.List;
import javax.inject.Inject;

/**
 * For on-demand backfills (low latency) we sink adhoc results to the primary analyzer result tables
 * rather than treating the results as ephemeral. This sink does just that.
 */
public class MainTableV3ResultsPostgresSink extends AnalyzerResultSinkV3 {

  @Inject AnalysisService analysisService;

  @Override
  public void publish(
      AdHocMonitorRequestV3 request, List<AnalyzerResult> analyzerResults, boolean skipDeletes) {
    // Anomalies vs non-anomalies are broken into two separate tables for query performance reasons

    analysisService.persistResults(
        analyzerResults, DestinationEnum.ANALYSIS_HYPERTABLES, skipDeletes);
  }
}

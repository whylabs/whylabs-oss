package ai.whylabs.dataservice.sinks;

import ai.whylabs.adhoc.resultsink.AnalyzerResultSinkV3;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.adhoc.DestinationEnum;
import ai.whylabs.dataservice.services.AnalysisService;
import java.util.List;
import javax.inject.Inject;

/** Sink for persisting the new PG backed monitor results to their new tables */
public class MainTableV3PGResultsPostgresSink extends AnalyzerResultSinkV3 {

  @Inject AnalysisService analysisService;

  @Override
  public void publish(
      AdHocMonitorRequestV3 request, List<AnalyzerResult> analyzerResults, boolean skipDeletes) {
    analysisService.persistResults(
        analyzerResults, DestinationEnum.ANALYSIS_HYPERTABLES_PG, skipDeletes);
  }
}

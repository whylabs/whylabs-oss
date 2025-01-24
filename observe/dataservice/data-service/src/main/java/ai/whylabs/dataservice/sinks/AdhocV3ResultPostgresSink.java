package ai.whylabs.dataservice.sinks;

import ai.whylabs.adhoc.resultsink.AnalyzerResultSinkV3;
import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.dataservice.adhoc.DestinationEnum;
import ai.whylabs.dataservice.services.AnalysisService;
import java.util.List;
import javax.inject.Inject;

/** Sink adhoc analyzer results to postgres using the analysis service */
public class AdhocV3ResultPostgresSink extends AnalyzerResultSinkV3 {
  @Inject AnalysisService analysisService;

  @Override
  public void publish(
      AdHocMonitorRequestV3 request, List<AnalyzerResult> analyzerResults, boolean skipDeletes) {
    analysisService.persistResults(analyzerResults, DestinationEnum.ADHOC_TABLE, skipDeletes);
  }
}

package ai.whylabs.adhoc.resultsink;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;

public abstract class AnalyzerResultSinkV3 {
  public abstract void publish(
      AdHocMonitorRequestV3 request, List<AnalyzerResult> analyzerResults, boolean skipDeletes);
  // public abstract DestinationEnum getQueue();
}

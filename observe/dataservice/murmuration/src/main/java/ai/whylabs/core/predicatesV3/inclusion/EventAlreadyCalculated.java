package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.utils.MonitorEventIdGenerator;
import java.util.Map;

public class EventAlreadyCalculated {

  public boolean test(
      MonitorEventIdGenerator eventIdGenerator,
      Map<Long, Map<String, AnalyzerResult>> monitorFeedbackLoop,
      Long targetBatchTimestamp,
      String analyzerId) {
    if (monitorFeedbackLoop == null || monitorFeedbackLoop.size() == 0) {
      return false;
    }
    if (!monitorFeedbackLoop.containsKey(targetBatchTimestamp)) {
      return false;
    }

    if (monitorFeedbackLoop.get(targetBatchTimestamp).containsKey(analyzerId)
        /**
         * The extra check here is probably not needed, but makes this predicate more robust against
         * bugs due relating to the context on an aggregation
         */
        && monitorFeedbackLoop
            .get(targetBatchTimestamp)
            .get(analyzerId)
            .getAnalysisId()
            .equals(eventIdGenerator.getAnalysisId())) {

      String failure =
          monitorFeedbackLoop.get(targetBatchTimestamp).get(analyzerId).getFailureExplanation();
      if (failure != null && failure.contains("NoHttpResponseException")) {
        // Allow python bridge communication exceptions to auto-retry
        return false;
      }

      return true;
    }

    return false;
  }
}

package ai.whylabs.core.aggregation;

import ai.whylabs.batch.MapFunctions.DigestModeAnomalyFilter;
import ai.whylabs.core.configV3.structure.EveryAnamolyMode;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.val;

public class AnalyzerResultsToSirenEveryAnomalyPayload {

  public static List<SirenEveryAnomalyPayload> to(
      AnalyzerResult analyzerResult, MonitorConfigV3 monitorConfigV3, String runId) {
    List<SirenEveryAnomalyPayload> payloads = new ArrayList();

    for (val m : monitorConfigV3.getMonitors()) {
      if ((m.getDisabled() != null && m.getDisabled())
          || m.getMode() == null
          || m.getAnalyzerIds() == null) {
        continue;
      }
      if (m.getMode().getClass().equals(EveryAnamolyMode.class)
          && m.getAnalyzerIds().contains(analyzerResult.getAnalyzerId())) {
        int severity = DigestModeAnomalyFilter.DEFAULT_SEVERITY;
        if (m.getSeverity() != null) {
          severity = m.getSeverity();
        }

        payloads.add(
            SirenEveryAnomalyPayload.builder()
                .id(UUID.randomUUID().toString())
                .mode(SirenEveryAnomalyPayload.EVERY_ANOMALY)
                .analyzerResult(analyzerResult)
                .severity(severity)
                .monitorId(m.getId())
                .runId(runId)
                .orgId(monitorConfigV3.getOrgId())
                .build());
      }
    }
    return payloads;
  }
}

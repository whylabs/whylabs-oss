package ai.whylabs.adhoc.structures;

import ai.whylabs.core.structures.SirenDigestPayload;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdHocMonitorResponse {
  public String runId;
  public boolean success;
  public Integer numEventsProduced;
  public Integer numAnomalies;
  public Integer numDigestsProduced;
  public List<AnalyzerResult> events;
  public List<SirenDigestPayload> sirenDigests;
  public List<SirenEveryAnomalyPayload> sirenEveryAnomaly;
}

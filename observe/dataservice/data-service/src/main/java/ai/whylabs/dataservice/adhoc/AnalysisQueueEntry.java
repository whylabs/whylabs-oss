package ai.whylabs.dataservice.adhoc;

import ai.whylabs.core.configV3.structure.Segment;
import java.util.HashSet;
import java.util.Set;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Builder
@EqualsAndHashCode
@ToString
public class AnalysisQueueEntry {
  private Long id;
  private String runId;
  private String columnName;
  private Set<Segment> segments;

  public void merge(AnalysisQueueEntry e) {
    if (segments == null) {
      segments = new HashSet<>();
    }
    if (e.getSegments() != null) {
      segments.addAll(e.getSegments());
    }
  }
}

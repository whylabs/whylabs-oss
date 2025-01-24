package ai.whylabs.core.utils;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import lombok.Getter;
import lombok.val;

@Getter
public class MonitorEventIdGenerator {

  /** Id represents a version of a specific datapoint (includes runid in the generation thereof) */
  private String id;

  /** Analysis Id represents a specific datapoint */
  private String analysisId;

  public MonitorEventIdGenerator(
      String orgId,
      String datasetId,
      String analyzerId,
      long ts,
      String segment,
      String runId,
      String field) {
    val sb =
        new StringBuilder()
            .append(orgId)
            .append(datasetId)
            .append(analyzerId)
            .append(ts)
            .append(segment);
    if (field != null) {
      sb.append(field);
    }

    analysisId = UUID.nameUUIDFromBytes(sb.toString().getBytes(StandardCharsets.UTF_8)).toString();

    sb.append(runId);
    id = UUID.nameUUIDFromBytes(sb.toString().getBytes(StandardCharsets.UTF_8)).toString();
  }
}

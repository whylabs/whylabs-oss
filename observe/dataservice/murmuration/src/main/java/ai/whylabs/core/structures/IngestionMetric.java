package ai.whylabs.core.structures;

import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class IngestionMetric implements Serializable {
  private String orgId;
  private String datasetId;
  private List<String> tags;
  private Long lastUploadTs;
  private String segment;
  private Long targetTimestamp;
}

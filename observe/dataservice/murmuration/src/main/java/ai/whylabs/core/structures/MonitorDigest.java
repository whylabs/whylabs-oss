package ai.whylabs.core.structures;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties
@FieldNameConstants
public class MonitorDigest {
  private String monitorJson;
  private String orgId;
  private String datasetId;
  // Duplicated, but putting top level makes joining easier
  private List<String> analyzerIds;
  private Integer severity;
  private String monitorId;
}

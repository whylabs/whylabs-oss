package ai.whylabs.druid.whylogs.metadata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@NoArgsConstructor
@AllArgsConstructor
public class BinMetadata {

  @NonNull private String orgId;
  private String datasetId;
  private Long datasetTimestamp;
  private Map<String, List<Map<String, String>>> tags;

  /**
   * ID gets used with single reference profiles which is a feature where someone uploads a single
   * profile and wants to reference it as the baseline
   */
  private String id;
  // TODO: the json comes with a tags element, but not sure what the purpose is

}

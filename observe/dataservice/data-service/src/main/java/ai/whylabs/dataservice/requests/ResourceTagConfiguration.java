package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResourceTagConfiguration {
  public static final String LABEL_TAG_KEY = "none";

  @JsonProperty(required = true)
  private Map<String, ResourceTagConfigEntry> tags;

  private List<String> labels;
}

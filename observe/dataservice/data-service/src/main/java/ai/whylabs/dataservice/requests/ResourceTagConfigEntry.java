package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResourceTagConfigEntry {
  @JsonProperty(required = true)
  private List<String> values;

  private String color;

  private String bgColor;
}

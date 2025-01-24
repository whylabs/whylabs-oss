package ai.whylabs.dataservice.models.llmTraces;

import com.fasterxml.jackson.annotation.JsonProperty;
import javax.annotation.Nullable;
import lombok.*;

@Builder(toBuilder = true)
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Data
public class LlmSecureEvent {
  @Nullable
  @JsonProperty("EventName")
  String EventName;

  @JsonProperty("EventAttributes")
  @Nullable
  Attributes EventAttributes;

  @Builder(toBuilder = true)
  @EqualsAndHashCode
  @NoArgsConstructor
  @AllArgsConstructor
  @Data
  public static class Attributes {
    @Nullable
    @JsonProperty("metric")
    private String metric;

    @Nullable
    @JsonProperty("failure_level")
    private String failure_level;
  }
}

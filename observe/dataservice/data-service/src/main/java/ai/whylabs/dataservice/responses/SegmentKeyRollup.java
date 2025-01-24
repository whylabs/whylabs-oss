package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SegmentKeyRollup {
  @JsonPropertyDescription("model shared by all feature/metrics found within this object.")
  String datasetId;

  @JsonPropertyDescription("segment value shared by all feature/metrics found within this object.")
  String segmentKeyValue;

  @JsonPropertyDescription("map from feature name to collection of metrics")
  Map<String, FeatureRollup> features;
}

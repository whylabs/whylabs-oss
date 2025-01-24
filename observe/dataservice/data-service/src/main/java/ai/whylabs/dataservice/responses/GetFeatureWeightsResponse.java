package ai.whylabs.dataservice.responses;

import ai.whylabs.core.configV3.structure.Metadata;
import ai.whylabs.core.configV3.structure.SegmentWeightConfig;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class GetFeatureWeightsResponse {

  private Metadata metadata;

  private List<SegmentWeightConfig> segmentWeights;
}

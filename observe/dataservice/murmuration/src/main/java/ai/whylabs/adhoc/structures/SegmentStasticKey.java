package ai.whylabs.adhoc.structures;

import lombok.Builder;
import lombok.EqualsAndHashCode;

@Builder
@EqualsAndHashCode
public class SegmentStasticKey {

  private String analyzerType;
  private String segment;
}

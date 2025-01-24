package ai.whylabs.adhoc.structures;

import lombok.Builder;
import lombok.EqualsAndHashCode;

@Builder
@EqualsAndHashCode
public class ColumnStasticKey {

  private String column;
  private String analyzerType;
}

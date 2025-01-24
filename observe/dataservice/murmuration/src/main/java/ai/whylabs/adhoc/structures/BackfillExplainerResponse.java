package ai.whylabs.adhoc.structures;

import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class BackfillExplainerResponse {
  private Map<String, List<String>> analyzerRunDates;
}

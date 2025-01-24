package ai.whylabs.dataservice.responses;

import java.util.Map;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode
public class TableSizesResponse {
  private Map<String, Long> counts;
}

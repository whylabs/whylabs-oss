package ai.whylabs.dataservice.responses;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ColumnStatsResponse {
  private Map<String, ColumnStat> columnStatMap;
}

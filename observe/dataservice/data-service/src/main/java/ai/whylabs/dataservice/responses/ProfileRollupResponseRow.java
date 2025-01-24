package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileRollupResponseRow {
  private String datasetId;

  private String metricPath;

  private String columnName;

  private String day;

  private String value;
}

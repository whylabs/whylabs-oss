package ai.whylabs.dataservice.structures;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ColumnSchema {
  private String column_name;
  private String udt_name;
}

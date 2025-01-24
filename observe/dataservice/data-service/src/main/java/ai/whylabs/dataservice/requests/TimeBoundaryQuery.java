package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;

@Data
public class TimeBoundaryQuery {
  @Schema(required = true)
  private String orgId;

  @Schema(required = true)
  private List<String> datasetIds;

  private List<SegmentTag> segment;
  private DataGranularity granularity;
}

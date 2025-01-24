package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.enums.SortOrder;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.joda.time.Interval;

@Data
@EqualsAndHashCode(callSuper = true)
public class MaxIORequest extends BaseRequest {
  @Schema(required = true)
  private String orgId;

  @Schema(required = true)
  private String datasetId;

  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @Schema(required = false)
  private List<SegmentTag> segment;

  @Schema(required = true)
  private List<String> outputColumns;

  @Schema(required = true)
  private DataGranularity granularity;

  @Schema(required = false)
  @JsonPropertyDescription("Order, (desc, asc). Default asc")
  private SortOrder order = SortOrder.asc;
}

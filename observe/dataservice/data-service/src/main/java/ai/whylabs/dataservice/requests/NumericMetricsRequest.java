package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.DataGranularity;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import org.joda.time.Interval;

@Data
@Builder
public class NumericMetricsRequest {

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  private List<SegmentTag> segment;

  @Schema(required = true, type = "string")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Dataset granularity")
  @Schema(required = true)
  private DataGranularity granularity;

  private String segmentKey;

  private DatasetAndColumn selector;
}

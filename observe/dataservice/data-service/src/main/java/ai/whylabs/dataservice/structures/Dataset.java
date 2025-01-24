package ai.whylabs.dataservice.structures;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Data
@Builder
public class Dataset {
  private Integer id;

  @Schema(required = true)
  private String orgId;

  @Schema(required = true)
  private String datasetId;

  private String name;
  private String granularity;
  private Boolean ingestionDisabled;
  private String type; // E.g. "CLASSIFICATION", "REGRESSION", "LLM" (see Songbird ModelType enum)
  private Boolean active;
  private Long
      createdTs; // Unix timestamp in milliseconds when the dataset was created, will be set on
  // insert if not specified
  private List<KeyValueTag> tags;
}

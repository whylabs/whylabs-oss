package ai.whylabs.dataservice.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResourceTag {
  @Schema(required = true)
  private String orgId;

  private String resourceId;

  @Schema(required = true)
  private String key;

  @Schema(required = true)
  private String value;

  private String color;

  private String bgColor;
}

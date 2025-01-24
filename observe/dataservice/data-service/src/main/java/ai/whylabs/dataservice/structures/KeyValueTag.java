package ai.whylabs.dataservice.structures;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class KeyValueTag {
  @Schema(required = true)
  private String key;

  @Schema(required = true)
  private String value;
}

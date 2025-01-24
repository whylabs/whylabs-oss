package ai.whylabs.dataservice.responses;

import com.whylogs.v0.core.message.InferredType.Type;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InferredTypeResult {

  private Type type;
  private Double ratio;
}

package ai.whylabs.druid.whylogs.schematracker;

import com.whylogs.v0.core.message.InferredType;
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
public class InferredTypePostAggregatorResultStructure {

  private InferredType.Type type;
  private Double ratio;
}

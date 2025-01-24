package ai.whylabs.dataservice.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MaintenanceWindowResponse {
  boolean isMaintenanceWindow;
}

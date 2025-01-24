package ai.whylabs.dataservice.responses;

import io.micronaut.core.annotation.Introspected;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@Introspected
@AllArgsConstructor
@NoArgsConstructor
public class DeletionReport {
  private int deletionRequestsRan;
}

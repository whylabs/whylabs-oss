package ai.whylabs.dataservice.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProfileAuditEntryResponse {
  private Long datasetTimestamp;
  private String traceId;
  private String file;
  private Long ingestTimestamp;
  private String referenceId;
  private String failure;
}

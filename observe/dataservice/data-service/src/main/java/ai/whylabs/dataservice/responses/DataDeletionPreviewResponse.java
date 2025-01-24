package ai.whylabs.dataservice.responses;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DataDeletionPreviewResponse {
  private Long numRows;
  private Long uniqueDates;
  private Long earliest;
  private Long latest;
}

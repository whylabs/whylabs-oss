package ai.whylabs.dataservice.structures;

import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class UploadPattern {
  /** typical delay between the dataset timestamp and when it gets uploaded */
  private Long approximateUploadLagMinutes;

  /** Typical delay between when an upload starts and when it ends */
  private Long approximateUploadWindowMinutes;
}

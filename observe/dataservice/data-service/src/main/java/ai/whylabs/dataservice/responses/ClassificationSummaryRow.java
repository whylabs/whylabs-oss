package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ClassificationSummaryRow {
  //  @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
  private final Long timestamp;
  private final Long last_upload_ts;

  private final double aucroc;
  private final double aucpr;
  private final double[][] roc;
  private final double[][] precision;
  private final double[][] calibration;
  private final ConfusionMatrix confusion;
}

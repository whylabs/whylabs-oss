package ai.whylabs.dataservice.responses;

import lombok.Builder;
import lombok.Data;

// stores individual value metrics derived from ScoreMatrixMessage protobuf message.
// These metrics are useful for monitor alerting.
@Builder
@Data
public class ClassificationMetricValues {
  private final double posMicroFpr;
  private final double posMicroTpr;
  private final double posMacroFpr;
  private final double posMacroTpr;
  private final double microFpr;
  private final double microRecall;
  private final double microPrecision;
  private final double microF1;
  private final double macroFpr;
  private final double macroRecall;
  private final double macroPrecision;
  private final double macroF1;
  private final double macroAuc;

  private final double recall;
  private final double fpr;
  private final double precision;
  private final double accuracy;
  private final double f1;

  private final long last_upload_ts;
}

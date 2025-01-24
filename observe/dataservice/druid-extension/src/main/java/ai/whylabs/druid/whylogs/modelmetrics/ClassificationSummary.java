package ai.whylabs.druid.whylogs.modelmetrics;

import lombok.Getter;

@Getter
public class ClassificationSummary {
  private final double[][] roc;
  private final double[][] precision;
  private final ConfusionMatrix confusion;

  public ClassificationSummary(double[][] roc, double[][] recall_prec, ConfusionMatrix cm) {
    this.roc = roc;
    this.precision = recall_prec;
    this.confusion = cm;
  }
}

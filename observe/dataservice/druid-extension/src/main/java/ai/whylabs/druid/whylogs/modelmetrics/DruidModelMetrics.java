package ai.whylabs.druid.whylogs.modelmetrics;

import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import com.whylogs.core.metrics.ClassificationMetrics;
import com.whylogs.core.metrics.ModelMetrics;
import com.whylogs.core.metrics.RegressionMetrics;
import com.whylogs.v0.core.message.ModelMetricsMessage;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

/**
 * This is the in-memory representation of model metrics when stored in Druid. It is a thin-veneer
 * that delegates to the ModelMetrics class from whylogs-java. We use this class (and other
 * delegating metrics classes) to implement proprietary derived metric calculations that we don't
 * want to expose in the open-source java library.
 *
 * <p>The encoded off-memory representation is always just the encapsulated ModelMetrics object.
 */
@Slf4j
public class DruidModelMetrics {

  private interface exclude {
    RegressionMetrics getRegressionMetrics();

    ClassificationMetrics getClassificationMetrics();

    ModelMetricsMessage.Builder toProtobuf();

    ModelMetrics merge(ModelMetrics other);
  }

  @Delegate(excludes = exclude.class)
  private ModelMetrics metrics;

  // public for Test access
  public DruidModelMetrics(ModelMetrics mm) {
    metrics = mm;
  }

  public DruidRegressionMetrics getRegressionMetrics() {
    val rm = metrics == null ? null : metrics.getRegressionMetrics();
    return rm == null ? null : new DruidRegressionMetrics(rm);
  }

  public DruidClassificationMetrics getClassificationMetrics() {
    val cm = metrics == null ? null : metrics.getClassificationMetrics();
    return cm == null ? null : new DruidClassificationMetrics(cm);
  }

  public static DruidModelMetrics fromProtobuf(ModelMetricsMessage msg) {

    if (msg == null || msg.getSerializedSize() == 0) {
      return null;
    }

    // workaround divide-by-zero exception in ScoreMatrix.fromProtobuf() if no labels are
    // provided.
    if (msg.getScoreMatrix().getSerializedSize() > 0
        && msg.getScoreMatrix().getLabelsCount() == 0
        && msg.getScoreMatrix().getScoresCount() > 0) {
      log.trace("Skipping classification ScoreMatrix: has scores but no labels");
      return null;
    }
    val mm = ModelMetrics.fromProtobuf(msg);
    return new DruidModelMetrics(mm);
  }

  public ModelMetricsMessage.Builder toProtobuf() {
    if (metrics == null) {
      return ModelMetricsMessage.newBuilder();
    }
    return metrics.toProtobuf();
  }

  public DruidModelMetrics merge(DruidModelMetrics other) {
    if (other == null) {
      return this;
    }
    if (metrics == null) {
      return other;
    }

    ModelMetrics newmetrics;
    try {
      newmetrics = metrics.merge(other.metrics);
    } catch (Exception e) {
      log.error("DruidModelMetrics.merge failed", e);
      return this;
    }

    // Avoid really large confusion matrix
    // If the merged model has too many labels, skip the merge.
    val cl = newmetrics.getClassificationMetrics();
    if (cl != null && cl.getLabels().size() > DatasetMetrics.MAX_LABELS) {
      log.error("skipping merge - too many labels in merged classification model");
      return this;
    }
    return new DruidModelMetrics(newmetrics);
  }

  public byte[] toByteArray() {
    return this.toProtobuf().build().toByteArray();
  }

  public final Long count() {
    val rm = getRegressionMetrics();
    return rm == null ? null : Long.valueOf(rm.getCount());
  }

  public final Double meanSquaredError() {
    val rm = getRegressionMetrics();
    return rm == null ? null : rm.meanSquaredError();
  }

  public final Double meanAbsoluteError() {
    val rm = getRegressionMetrics();
    return rm == null ? null : rm.meanAbsoluteError();
  }

  public final Double rootMeanSquaredError() {
    val rm = getRegressionMetrics();
    return rm == null ? null : rm.rootMeanSquaredError();
  }

  public final Double getRecall() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getRecall();
  }

  public final Double getFpr() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getFpr();
  }

  public final Double getPrecision() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getPrecision();
  }

  public final Double getAccuracy() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getAccuracy();
  }

  public final Double getF1() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getF1();
  }

  public final Double getAuROC() {
    val cm = getClassificationMetrics();
    return cm == null ? null : cm.toMetricValues().getMacroAuc();
  }
}

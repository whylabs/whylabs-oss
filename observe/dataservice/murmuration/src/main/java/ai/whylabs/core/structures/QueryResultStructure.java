package ai.whylabs.core.structures;

import ai.whylabs.core.aggregation.ResultPostAggregatorNoDruid;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.druid.whylogs.modelmetrics.DruidModelMetrics;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregatorResultStructure;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.core.metrics.ModelMetrics;
import com.whylogs.v0.core.message.*;
import java.io.Serializable;
import java.util.*;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;

/**
 * Final structure we output from a druid query. Some fields like the sketch byte arrays are nice to
 * have at the top level as native spark binary types. That eliminates base64 overhead for json
 * encoding. Our postAggregators on the other hand produce pretty complex structures that become
 * json in the "event" column which is designed to mirror how it comes out of Druid. The perk of
 * json is that we don't have to communicate a complex dataframe structure to pySpark, but we might
 * consider flipping that around if we port more monitor code into java.
 *
 * <p>To be used with queries that include TS_GRANULARITY.
 */
@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@Slf4j
public class QueryResultStructure implements Serializable {

  private ExplodedRow in;
  private Long rollupTimestamp;

  public QueryResultStructure(ExplodedRow in, Long rollupTimestamp) {
    this.in = in;
    this.rollupTimestamp = rollupTimestamp;
  }

  public String getColumnName() {
    return in.getColumnName();
  }

  public String getDatasetid() {
    return in.getDatasetId();
  }

  public String getOrgid() {
    return in.getOrgId();
  }

  public String getSegmentText() {
    return in.getSegmentText();
  }

  public byte[] getFrequentItems() {
    return in.getFrequentItems();
  }

  public byte[] getHistogram() {
    return in.getHistogram();
  }

  public byte[] getHll() {
    return in.getUniqueCount();
  }

  public byte[] getVarianceTracker() {
    return in.getVariance_tracker();
  }

  public byte[] getClassification() {
    return in.getClassification();
  }

  public byte[] getRegression() {
    return in.getRegression();
  }

  public Long getTotalCount() {
    return in.getCounters_count();
  }

  public Long getSchemaCountUnknown() {
    return in.getSchema_count_UNKNOWN();
  }

  public Long getSchemaCountFractional() {
    return in.getSchema_count_FRACTIONAL();
  }

  public Long getSchemaCountIntegral() {
    return in.getSchema_count_INTEGRAL();
  }

  public Long getSchemaCountBoolean() {
    return in.getSchema_count_BOOLEAN();
  }

  public Long getSchemaCountString() {
    return in.getSchema_count_STRING();
  }

  public Long getNullCount() {
    return in.getSchema_count_NULL();
  }

  public Double getUnique() {
    byte[] bytes = in.getUniqueCount();
    if (bytes != null && bytes.length > 0) {
      val sketch = HllSketch.wrap(Memory.wrap(bytes));
      return sketch.getEstimate();
    }
    return null;
  }

  public Boolean getDiscrete() {
    Map<String, Object> reduced = new HashMap<>();
    byte[] bytes = in.getUniqueCount();
    if (in.getCounters_count() != null && bytes != null && bytes.length > 0) {
      val hll = HllSketch.wrap(Memory.wrap(bytes));
      val type = getInferredType();
      return ResultPostAggregatorNoDruid.compute(hll, in.getCounters_count(), type.getType());
    }
    return null;
  }

  public InferredTypePostAggregatorResultStructure getInferredType() {
    return ResultPostAggregatorNoDruid.computeInferredType(in);
  }

  public Long getRollupTimestamp() {
    return rollupTimestamp;
  }

  public Boolean getMissing() {
    return in.getMissing();
  }

  public Double getWeight() {
    return in.getWeight();
  }

  public DruidModelMetrics getModelMetrics() {
    ModelMetricsMessage m = null;
    try {
      if (in.getClassification() != null) {
        m =
            ModelMetricsMessage.newBuilder()
                .setModelType(ModelType.CLASSIFICATION)
                .setScoreMatrix(ScoreMatrixMessage.parseFrom(in.getClassification()))
                .build();
      } else if (in.getRegression() != null) {
        m =
            ModelMetricsMessage.newBuilder()
                .setModelType(ModelType.REGRESSION)
                .setRegressionMetrics(RegressionMetricsMessage.parseFrom(in.getRegression()))
                .build();
      }

      return new DruidModelMetrics(ModelMetrics.fromProtobuf(m));
    } catch (InvalidProtocolBufferException e) {
      log.error("Error parsing model metrics, {}", in);
    }
    return new DruidModelMetrics(null);
  }

  public Double getClassification_recall() {
    return getModelMetrics().getRecall();
  }

  public Double getClassification_fpr() {
    return getModelMetrics().getFpr();
  }

  public Double getClassification_precision() {
    return getModelMetrics().getPrecision();
  }

  public Double getClassification_accuracy() {
    return getModelMetrics().getAccuracy();
  }

  public Double getClassification_f1() {
    return getModelMetrics().getF1();
  }

  public Double getClassification_auroc() {
    return getModelMetrics().getAuROC();
  }

  public Double getRegression_mse() {
    val m = getModelMetrics().getRegressionMetrics();
    return m != null ? m.meanSquaredError() : null;
  }

  public Double getRegression_mae() {
    val m = getModelMetrics().getRegressionMetrics();
    return m != null ? m.meanAbsoluteError() : null;
  }

  public Double getRegression_rmse() {
    val m = getModelMetrics().getRegressionMetrics();
    return m != null ? m.rootMeanSquaredError() : null;
  }

  public Long getMostRecentDatalakeWriteTs() {
    return in.getMostRecentDatalakeWriteTs();
  }

  public List<String> getDatasetFields() {
    return in.getDatasetFields();
  }

  public Long getLastUploadTs() {
    return in.getLastUploadTs();
  }

  public TargetLevel getTargetLevel() {
    return in.getTargetLevel();
  }

  public List<String> getTraceIds() {
    return in.getTraceIds();
  }
}

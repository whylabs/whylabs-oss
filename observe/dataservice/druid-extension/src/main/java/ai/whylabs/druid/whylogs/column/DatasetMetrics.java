package ai.whylabs.druid.whylogs.column;

import ai.whylabs.druid.whylogs.modelmetrics.DruidModelMetrics;
import com.google.common.collect.ImmutableList;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import com.whylogs.v0.core.message.ModelMetricsMessage;
import com.whylogs.v0.core.message.ModelType;
import java.util.List;
import javax.annotation.Nullable;
import lombok.Getter;

@Getter
public class DatasetMetrics implements WhyLogsMetrics {

  public static final int MAX_LABELS = 20; // max labels in classification model.

  public static final String INTERNAL_PREFIX = "__internal__";
  public static final String DATASET_METRICS = INTERNAL_PREFIX + ".datasetMetrics";
  public static final String MODEL_TYPE = "model.type";
  public static final String MODEL_METRICS = "model_metrics";
  public static final String FIELDS = "fields";

  private final long timestamp;
  private final String orgId;
  private final String datasetId;
  private final String referenceProfileId;
  private final List<String> tags;

  private final DatasetProfileMessage msg;
  private final ModelType modelType;
  private final DruidModelMetrics modelMetrics;

  /**
   * DatasetMetrics are associated with a dataset rather than a particular feature. We store these
   * metrics in Druid as if they were another feature, but we give it an obscure columnName that we
   * hope will not conflict with customer features.
   */
  public DatasetMetrics(
      long timestamp,
      String orgId,
      String datasetId,
      String referenceProfileId,
      List<String> tags,
      DatasetProfileMessage msg) {
    this.timestamp = timestamp;
    this.orgId = orgId;
    this.datasetId = datasetId;
    this.referenceProfileId = referenceProfileId;
    this.tags = ImmutableList.copyOf(tags);
    this.msg = msg;
    this.modelType = msg.getModeProfile().getMetrics().getModelType();

    // Restrict CLASSIFICATION metric size - too many labels cause performance problems.
    ModelMetricsMessage mmMsg = msg.getModeProfile().getMetrics();
    if (modelType == ModelType.CLASSIFICATION
        && mmMsg.getScoreMatrix().getLabelsCount() > MAX_LABELS) {
      mmMsg = ModelMetricsMessage.getDefaultInstance();
    }
    this.modelMetrics = DruidModelMetrics.fromProtobuf(mmMsg);
  }

  /**
   * @return a fake columnName where we stash dataset metrics as if they were another feature.
   */
  public String getName() {
    return DATASET_METRICS;
  }

  public long getTimestampFromEpoch() {
    return timestamp;
  }

  @Nullable
  public Object getRaw(String dimension) {
    switch (dimension) {
      case MODEL_TYPE:
        return modelMetrics != null ? modelMetrics.getModelType() : null;
      case MODEL_METRICS:
        return ai.whylabs.druid.whylogs.modelmetrics.Operations.serialize(modelMetrics);
      case WhyLogsRow.REFERENCE_PROFILE_ID:
        return referenceProfileId;
      case FIELDS:
        return msg.getColumnsMap().keySet();
      default:
        return null; // do not throw exception on Unknown dimension
    }
  }

  @Override
  public String toString() {
    return "DatasetMetrics{"
        + "timestamp="
        + timestamp
        + ", orgId='"
        + orgId
        + '\''
        + ", datasetId='"
        + datasetId
        + '\''
        + ", referenceProfileId='"
        + referenceProfileId
        + '\''
        + ", tags="
        + tags
        + ", msg="
        + msg
        + ", modelType="
        + modelType
        + ", modelMetrics="
        + modelMetrics
        + '}';
  }
}

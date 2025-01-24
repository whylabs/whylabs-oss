package ai.whylabs.druid.whylogs.column;

import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import ai.whylabs.druid.whylogs.operationalMetrics.Direction;
import com.google.common.collect.ImmutableList;
import com.whylogs.core.ColumnProfile;
import com.whylogs.v0.core.message.ColumnMessageV0;
import com.whylogs.v0.core.message.NumbersMessage;
import java.util.List;
import javax.annotation.Nullable;
import lombok.Getter;
import lombok.val;

@Getter
public class ProfileMetrics implements WhyLogsMetrics {

  public static final String COLUMN_PROFILE = "columnProfile";
  public static final String DIRECTION = "direction";
  public static final String UNIQUE_COUNT = "uniqueCount";
  public static final String HISTOGRAM = "histogram";
  public static final String FREQUENT_ITEMS = "frequentItems";
  public static final String VARIANCE = "variance";

  // One fewer dependencies not having to pull in
  // https://github.com/apache/druid/blob/8296123d895db7d06bc4517db5e767afb7862b83/extensions-core/datasketches/src/main/java/org/apache/druid/query/aggregation/datasketches/hll/HllSketchModule.java#L50
  public static final String HLL_MERGE_TYPE_NAME = "HLLSketchMerge";

  private final long timestamp;
  private final String orgId;
  private final String datasetId;
  private final String referenceProfileId;
  private final List<String> tags;

  private final ColumnMessageV0 msg;
  private final ColumnProfile colProfile;
  private Direction direction;

  public ProfileMetrics(
      long timestamp,
      String orgId,
      String datasetId,
      String referenceProfileId,
      List<String> tags,
      ColumnMessageV0 msg,
      Direction direction) {
    this.timestamp = timestamp;
    this.orgId = orgId;
    this.datasetId = datasetId;
    this.referenceProfileId = referenceProfileId;
    this.tags = ImmutableList.copyOf(tags);
    this.msg = msg;
    this.colProfile = ColumnProfile.fromProtobuf(this.msg);
    this.direction = direction;
  }

  public Direction getDirection() {
    return direction;
  }

  public String getName() {
    return this.msg.getName();
  }

  public long getTimestampFromEpoch() {
    return timestamp;
  }

  @Nullable
  public Object getRaw(String dimension) {
    switch (dimension) {
      case COLUMN_PROFILE: // start complex metrics
        return colProfile;
      case UNIQUE_COUNT:
        return colProfile.getCardinalityTracker().toCompactByteArray();
      case HISTOGRAM:
        return colProfile.getNumberTracker().getHistogram().toByteArray();
      case FREQUENT_ITEMS:
        return FrequencyOperations.serialize(colProfile.getFrequentItems());
      case WhyLogsRow.REFERENCE_PROFILE_ID:
        return referenceProfileId;
      case DIRECTION:
        return direction;
      case VARIANCE:
        NumbersMessage numbers = msg.getNumbers();
        if (numbers != null) {
          return numbers.getVariance().toByteArray();
        }
        return null;
      default:
        val selector = SimpleMetricSelector.SELECTORS.get(dimension);
        if (selector != null) {
          return selector.apply(colProfile);
        }
        return null; // do not throw exception on Unknown dimension
    }
  }

  @Override
  public String toString() {
    return "ProfileMetrics{"
        + "timestamp="
        + timestamp
        + ", orgId='"
        + orgId
        + '\''
        + ", datasetId='"
        + datasetId
        + '\''
        + ", tags="
        + tags
        + ", msg="
        + msg
        + ", colProfile="
        + colProfile
        + '}';
  }
}

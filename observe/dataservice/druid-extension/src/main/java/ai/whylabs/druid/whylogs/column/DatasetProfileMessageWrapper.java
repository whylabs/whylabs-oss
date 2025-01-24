package ai.whylabs.druid.whylogs.column;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.REFERENCE_PROFILE_ID;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import ai.whylabs.druid.whylogs.operationalMetrics.Direction;
import com.google.common.base.Preconditions;
import com.whylogs.v0.core.message.ColumnMessageV0;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import lombok.NonNull;
import lombok.val;

public class DatasetProfileMessageWrapper {

  public static final String TAG_PREFIX = "whylogs.tag.";
  public static final int TAG_PREFIX_LEN = TAG_PREFIX.length();
  public static final String OUTPUT_KEYWORD_CONST = "output";

  private DatasetProfileMessage msg;
  private List<String> tags;
  private Long ingestionTs;

  public DatasetProfileMessageWrapper(DatasetProfileMessage msg, Long ingestionTs) {
    this.msg = msg;
    tags =
        extractTags(
            msg.getProperties() //
                .getTagsMap());
    this.ingestionTs = ingestionTs;
  }

  public DatasetProfileMessageWrapper(DatasetProfileMessage msg) {
    this.msg = msg;
    tags =
        extractTags(
            msg.getProperties() //
                .getTagsMap());
  }

  @Nullable
  public String getSessionId() {
    return this.msg.getProperties().getSessionId();
  }

  @NonNull
  public Iterator<ProfileMetrics> columnProfileMetricsIterator(BinMetadata metadata) {
    return msg
        .getColumnsMap() //
        .values() //
        .stream() //
        .map(
            col -> {
              try {
                return getProfileMetrics(col, metadata);
              } catch (Exception e) {
                return null;
              }
            })
        .filter(Objects::nonNull)
        .iterator();
  }

  public ProfileMetrics getProfileMetrics(ColumnMessageV0 col, BinMetadata metadata) {
    // This is oldschool whylogs, when V1 launches a more formalized way to know direction we should
    // switch to that and keep this as a fallback for legacy uploads

    Direction direction = Direction.INPUT;
    if (col.getName().contains(OUTPUT_KEYWORD_CONST)) {
      direction = Direction.OUTPUT;
    }

    val properties = msg.getProperties();

    Optional<BinMetadata> maybeMetadata = Optional.ofNullable(metadata);
    val timestamp =
        maybeMetadata.map(BinMetadata::getDatasetTimestamp).orElse(properties.getDataTimestamp());
    val orgId =
        maybeMetadata
            .map(BinMetadata::getOrgId)
            .orElseGet(() -> properties.getTagsOrDefault(ORG_ID, null));
    Preconditions.checkNotNull(orgId, "OrgId tag is null");
    val datasetId =
        maybeMetadata
            .map(BinMetadata::getDatasetId)
            .orElseGet(() -> properties.getTagsOrDefault(DATASET_ID, null));
    Preconditions.checkNotNull(datasetId, "DatasetId tag is null");
    Set<String> tagSet = new HashSet<>();
    if (tags != null) {
      tagSet.addAll(tags);
    }

    if (metadata != null) {
      tagSet.addAll(extractTags(BinMetadataEnforcer.collapseTagMap(metadata)));
    }

    val referenceProfileId =
        maybeMetadata
            .map(BinMetadata::getId)
            .orElseGet(() -> properties.getTagsOrDefault(REFERENCE_PROFILE_ID, null));

    return new ProfileMetrics(
        timestamp,
        orgId,
        datasetId,
        referenceProfileId,
        tagSet.stream().collect(Collectors.toList()),
        col,
        direction);
  }

  public DatasetMetrics getDatasetMetrics() {
    return this.getDatasetMetrics(null);
  }

  public DatasetMetrics getDatasetMetrics(BinMetadata metadata) {
    val properties = msg.getProperties();
    val tagMap = msg.getProperties().getTagsMap();
    Optional<BinMetadata> metadataOptional = Optional.ofNullable(metadata);
    val orgId = metadataOptional.map(BinMetadata::getOrgId).orElse(tagMap.get(ORG_ID));
    Preconditions.checkNotNull(orgId, "Organization ID is null");
    val datasetId = metadataOptional.map(BinMetadata::getDatasetId).orElse(tagMap.get(DATASET_ID));
    Preconditions.checkNotNull(datasetId, "Dataset ID is null for " + orgId);
    val referenceProfileId =
        metadataOptional.map(BinMetadata::getId).orElse(tagMap.get(REFERENCE_PROFILE_ID));

    Set<String> tagSet = new HashSet<>();
    if (tags != null) {
      tagSet.addAll(tags);
    }

    if (metadata != null) {
      tagSet.addAll(extractTags(BinMetadataEnforcer.collapseTagMap(metadata)));
    }

    val timestamp =
        metadataOptional
            .map(BinMetadata::getDatasetTimestamp)
            .orElse(properties.getDataTimestamp());
    return new DatasetMetrics(
        timestamp,
        orgId,
        datasetId,
        referenceProfileId,
        tagSet.stream().collect(Collectors.toList()),
        msg);
  }

  @Nullable
  public String getOrgId() {
    return msg.getProperties().getTagsMap().get(ORG_ID);
  }

  public List<String> getTags() {
    return tags;
  }

  public int getColumnCount() {
    return msg.getColumnsCount();
  }

  public DatasetProfileMessage getMsg() {
    return msg;
  }

  @Override
  public String toString() {
    return "DatasetProfileMessageWrapper{" + "msg=" + msg + ", tags=" + tags + '}';
  }

  public static List<String> extractTags(Map<String, String> tagsMap) {
    return tagsMap //
        .entrySet() //
        .stream() //
        .filter(e -> e.getKey().startsWith(TAG_PREFIX))
        .map(e -> e.getKey().substring(TAG_PREFIX_LEN) + "=" + e.getValue())
        .collect(Collectors.toList());
  }
}

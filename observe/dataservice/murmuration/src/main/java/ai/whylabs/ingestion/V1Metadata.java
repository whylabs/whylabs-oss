package ai.whylabs.ingestion;

import static ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper.TAG_PREFIX;
import static ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper.TAG_PREFIX_LEN;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.*;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.REFERENCE_PROFILE_ID;
import static ai.whylabs.ingestion.IMetricsIterator.WHYLOGS_VERSION0;

import ai.whylabs.batch.utils.TraceIdUtils;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import com.whylogs.core.message.DatasetProperties;
import com.whylogs.core.message.DatasetSegmentHeader;
import com.whylogs.core.message.Segment;
import com.whylogs.core.message.SegmentTag;
import com.whylogs.v0.core.message.DatasetPropertiesV0;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.val;

@Getter
public class V1Metadata {

  /**
   * Convenient packaging for V1-format protobuf message structs. These are derived from V1 headers,
   * or constructed from V0 messages. `properties` may be modified after initialization with
   * additional operational metadata.
   */
  private DatasetProperties properties;

  private final DatasetSegmentHeader segmentHeader;

  /** Constructor to be used when building V1Metadata from a V1-style protobuf messages */
  V1Metadata(DatasetProperties properties, DatasetSegmentHeader segmentHeader) {
    this.properties = properties;
    this.segmentHeader = segmentHeader;
  }

  /** May also be constricted from V0-style protobuf message */
  @VisibleForTesting
  public V1Metadata(DatasetPropertiesV0 v0properties, BinMetadata metadata) {
    this.properties = mkProperties(v0properties, metadata);
    this.segmentHeader = mkSegmentHeader(v0properties, metadata);
  }

  /**
   * Constructs and returns a new instance of the V1 {@link DatasetProperties} based on the provided
   * V0 properties and metadata.
   *
   * @param metadata The metadata for the dataset, which may be null. Extracted from JSON test file.
   * @param properties V0-style Dataset Properties, extracted from header of V0 binary profile.
   * @return A new instance of V1-style {@link DatasetProperties} with values derived from the
   *     metadata and properties.
   */
  static DatasetProperties mkProperties(DatasetPropertiesV0 properties, BinMetadata metadata) {
    Optional<BinMetadata> maybeMetadata = Optional.ofNullable(metadata);

    val orgId =
        maybeMetadata.map(BinMetadata::getOrgId).orElse(properties.getTagsMap().get(ORG_ID));
    val datasetId =
        maybeMetadata
            .map(BinMetadata::getDatasetId)
            .orElse(properties.getTagsMap().get(DATASET_ID));
    val referenceProfileId =
        maybeMetadata
            .map(BinMetadata::getId)
            .orElse(properties.getTagsMap().get(REFERENCE_PROFILE_ID));
    val traceId = TraceIdUtils.getTraceId(properties.getMetadataMap());
    val timestamp =
        maybeMetadata.map(BinMetadata::getDatasetTimestamp).orElse(properties.getDataTimestamp());

    Map<String, String> tagMap = BinMetadataEnforcer.collapseTagMap(metadata);

    val propertiesBuilder = DatasetProperties.newBuilder();
    propertiesBuilder
        .setCreationTimestamp(properties.getSessionTimestamp())
        .setDatasetTimestamp(timestamp)
        .setSchemaMajorVersion(1)
        .setSchemaMinorVersion(2)
        .putAllTags(tagMap);

    propertiesBuilder.putTags(ORG_ID, orgId);
    propertiesBuilder.putTags(DATASET_ID, datasetId);
    propertiesBuilder.putTags("format", WHYLOGS_VERSION0);

    // these are nullable values
    Optional.ofNullable(traceId)
        .ifPresent(str -> propertiesBuilder.putTags(TraceIdUtils.TRACE_ID, str));
    Optional.ofNullable(referenceProfileId)
        .ifPresent(str -> propertiesBuilder.putTags(REFERENCE_PROFILE_ID, str));

    return propertiesBuilder.build();
  }

  /**
   * Constructs and returns a new instance of {@link DatasetSegmentHeader} based on the provided
   * version 0 properties and JSON metadata.
   *
   * @param properties The version 0 properties for the dataset.
   * @param metadata The JSON metadata for the dataset, which may be null.
   * @return A new instance of {@link DatasetSegmentHeader} with segment tags derived from both
   *     version 0 properties and metadata.
   */
  static DatasetSegmentHeader mkSegmentHeader(
      DatasetPropertiesV0 properties, BinMetadata metadata) {
    // Segment tags are treated differently than other tags like ORGID and DATASETID.
    // We can safely accept segment tags from both metadata and profile properties without security
    // implications. If the user lies in their profile segment tags, they only impact themselves.
    // Plus almost nobody supplies correct segment tags in metadata so we have to
    // respect the profile tags.
    Optional<BinMetadata> maybeMetadata = Optional.ofNullable(metadata);
    HashMap<String, String> tags = new HashMap<>();
    tags.putAll(properties.getTagsMap());
    tags.putAll(
        maybeMetadata.map(BinMetadataEnforcer::collapseTagMap).orElse(Collections.emptyMap()));
    val segmentTags =
        tags.entrySet().stream()
            .filter(e -> e.getKey().startsWith(TAG_PREFIX))
            .map(
                e ->
                    SegmentTag.newBuilder()
                        .setKey(e.getKey().substring(TAG_PREFIX_LEN))
                        .setValue(e.getValue())
                        .build())
            .collect(Collectors.toList());

    val segment = Segment.newBuilder().addAllTags(segmentTags);
    val header =
        DatasetSegmentHeader.newBuilder()
            .addSegments(segment)
            .setHasSegments(segmentTags.size() > 0);
    return header.build();
  }

  // convenience function for adding metadata tags
  public void addAll(ImmutableMap<String, String> metadata) {
    val builder = DatasetProperties.newBuilder(properties);
    properties = builder.putAllMetadata(metadata).build();
  }

  // convenience function for adding metadata tags
  public void add(String key, String value) {
    val builder = DatasetProperties.newBuilder(properties);
    properties = builder.putMetadata(key, value).build();
  }

  // convenience function for retrieving orgId from header properties
  public String getOrgId() {
    return properties.getTagsMap().get(ORG_ID);
  }

  // convenience function for retrieving datasetId from header properties
  public String getDatasetId() {
    return properties.getTagsMap().get(DATASET_ID);
  }

  public long getDatasetTimestamp() {
    return properties.getDatasetTimestamp();
  }

  /**
   * return a sorted list of string segment tags, e.g. [ "purpose=vacation","verification_status=Not
   * Verified"]. Returns null if there are no segments.
   */
  public List<String> extractSegments() {
    if (!segmentHeader.getHasSegments()) {
      return null;
    }

    return segmentHeader.getSegmentsList().stream()
        .flatMap(s -> s.getTagsList().stream())
        .map(s -> s.getKey() + "=" + s.getValue())
        .sorted()
        .collect(Collectors.toList());
  }
}

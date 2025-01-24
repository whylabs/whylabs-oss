package ai.whylabs.ingestion;

import static ai.whylabs.druid.whylogs.column.WhyLogsRow.DATASET_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.ORG_ID;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.REFERENCE_PROFILE_ID;
import static com.whylogs.core.DatasetProfile.TAG_PREFIX;
import static java.util.Collections.unmodifiableMap;

import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableList;
import com.google.common.io.ByteStreams;
import com.whylogs.core.message.*;
import com.whylogs.core.message.ChunkHeader.ChunkType;
import com.whylogs.v0.core.message.ColumnMessageV0;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.channels.Channels;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.jetbrains.annotations.NotNull;

@Slf4j
public class V1ChunkIterator implements IMetricsIterator, AutoCloseable {

  public static final String MAGIC_HEADER = "WHY1";
  public static final int MARK_LIMIT = 1024;

  static class EndOfFileException extends IOException {}

  private static final int HEADER_LENGTH = MAGIC_HEADER.length();

  private final BufferedInputStream bis;
  private final BinMetadata metadata;

  private final Path tmpFile;
  private final SeekableByteChannel fc;
  private final InputStream seekableInputstream;

  private Iterator<Entry<String, ChunkOffsets>> columnOffsetIt = Collections.emptyIterator();
  private Map<Integer, String> indexedMetricPaths;
  private Map<String, ChunkOffsets> columnOffsets;
  private DatasetProperties properties;
  private DatasetSegmentHeader segmentHeader;

  private ColumnMessageV0 currentColumn;
  private Pair<String, ColumnMessage> currentPair;
  private volatile boolean isClosed;
  private String path;

  public V1ChunkIterator(BufferedInputStream bif, @Nullable BinMetadata metadata, String path)
      throws IOException {

    this.isClosed = false;
    this.bis = bif;
    this.path = path;
    this.metadata = metadata;

    // We copy the stream to the temp file so that we can randomly access the datastream. In theory,
    // we can stream
    // iterate it but that will require a lot more logic to map each chunked message to the
    // appropriate columns. I'm
    // just taking the shortest path here.
    this.tmpFile = Files.createTempFile("profile", ".bin");
    this.fc = Files.newByteChannel(this.tmpFile, StandardOpenOption.READ);
    this.seekableInputstream = Channels.newInputStream(this.fc);

    // Technically V1 profiles can hold multiple DatasetProfileHeaders, but that is not done in
    // practice,  In fact due
    // to a whylogs bug that appended garbage bytes to the end of the profile, it would be difficult
    // to actually parse a
    // second header without error. For that reason we just parse the headers once.
    //
    // skip V1 magic header
    // Before getting here, use checkMagicHeader() to verify this is a V1-format stream.
    bif.skip(HEADER_LENGTH);
    readHeader();
    this.currentPair = getNextColumn();
  }

  /**
   * Parse V1-style DatasetSegmentHeader and DatasetProfileHeader from instance BufferedInputStream.
   *
   * <p>Note Magic header "WHY1" occurs only once at beginning of stream, followed by potentially
   * multiple messages, each containing DatasetProfileHeader. Magic header should have already been
   * skipped before calling this routine.
   */
  private void readHeader() throws IOException {

    segmentHeader = DatasetSegmentHeader.parseDelimitedFrom(bis);
    if (segmentHeader == null) {
      log.warn("Failed to parse v1 DatasetSegmentHeader");
      // Do not throw exception - whylogs is producing profiles with junk bytes at the end.
      // just ignore parse errors and move on.
      this.close();
      return;
    }

    // workaround whylogs bug that puts V0 tag prefix on V1 segment keys
    segmentHeader = stripPrefix(segmentHeader);

    val header = DatasetProfileHeader.parseDelimitedFrom(bis);
    if (header == null || header.getSerializedSize() == 0) {
      log.warn("Failed to parse v1 DatasetProfileHeader");
      // Do not throw exception - whylogs is producing profiles with junk bytes at the end.
      // just ignore parse errors and move on.
      this.close();
      return;
    }

    properties = enforceProperties(header.getProperties(), metadata);
    long totalLength = header.getLength();

    // indexed metric name
    this.indexedMetricPaths = unmodifiableMap(header.getIndexedMetricPathsMap());
    this.columnOffsets = unmodifiableMap(header.getColumnOffsetsMap());
    this.columnOffsetIt = this.columnOffsets.entrySet().iterator();

    try (val os = Files.newOutputStream(tmpFile)) {
      //noinspection UnstableApiUsage
      ByteStreams.copy(ByteStreams.limit(bis, totalLength), os);
    }
    this.fc.position(0L);
  }

  /**
   * Non-destructively check if this input stream contains a V1-style whylogs profile. Returns True
   * if stream begins with V1 Magic number, False otherwise.
   */
  public static boolean isV1Format(BufferedInputStream bis) {
    byte[] headerBuf = new byte[HEADER_LENGTH];
    bis.mark(MARK_LIMIT);
    try {
      bis.read(headerBuf);
      bis.reset();
    } catch (IOException e) {
      return false;
    }
    String headerText = new String(headerBuf, StandardCharsets.UTF_8);
    return MAGIC_HEADER.equals(headerText);
  }

  @SneakyThrows
  private Pair<String, ColumnMessage> getNextColumn() {
    if (!columnOffsetIt.hasNext()) {
      return null;
    }

    val offsetEntry = columnOffsetIt.next();
    val offsets = offsetEntry.getValue().getOffsetsList();
    for (Long offset : offsets) {
      try {
        this.fc.position(offset);
      } catch (IOException e) {
        log.warn("Failed to change position to offset: %d", offset);
        continue;
      }
      final ChunkHeader chunkheader;
      try {
        chunkheader = ChunkHeader.parseDelimitedFrom(this.seekableInputstream);
      } catch (IOException e) {
        log.warn("Failed to read chunk header");
        continue;
      }

      if (chunkheader.getType() != ChunkType.COLUMN) {
        log.error("Expecting COLUMN chunk type, got %s", chunkheader.getType());
        continue;
      }

      val lengthLimitedStream =
          ByteStreams.limit(this.seekableInputstream, chunkheader.getLength());
      final ChunkMessage chunkMessage;
      try {
        chunkMessage = ChunkMessage.parseFrom(lengthLimitedStream);
      } catch (IOException e) {
        log.warn("Failed to read ChunkMessage");
        continue;
      }

      val builder = ColumnMessage.newBuilder();
      for (val metricEntry : chunkMessage.getMetricComponentsMap().entrySet()) {
        Integer key = metricEntry.getKey();
        String metricPath = this.indexedMetricPaths.get(key);
        if (metricPath == null) {
          log.warn("Missing metric path for metric index: %d", key);
          continue;
        }
        builder.putMetricComponents(metricPath, metricEntry.getValue());
      }
      return Pair.of(offsetEntry.getKey(), builder.build());
    }
    return null;
  }

  @Override
  public boolean hasNext() {
    if (this.currentPair == null) {
      this.currentPair = getNextColumn();
    }

    boolean hasNext = this.currentPair != null;
    if (!hasNext) {
      this.close();
    }
    return hasNext;
  }

  public void close() {
    if (!this.isClosed) {
      try {
        this.seekableInputstream.close();
        this.fc.close();
        Files.deleteIfExists(this.tmpFile);
      } catch (IOException e) {
        log.warn("Failed to close V1ChunkIterator");
      } finally {
        this.isClosed = true;
      }
    }
  }

  @Override
  public Pair<String, ColumnMessage> next() {
    if (!this.hasNext()) {
      throw new NoSuchElementException();
    }
    val pair = this.currentPair;
    this.currentPair = null;
    return pair;
  }

  @Override
  public V1Metadata getMetadata() {
    hasNext();
    return new V1Metadata(properties, segmentHeader);
  }

  /**
   * Strip V0 tag prefix from V1 segment keys.
   *
   * <p>Due to a bug in whylogs, V0 prefix is put into V1 segment keys. One day it might get fixed
   * so check for prefix before stripping.
   */
  @NotNull
  private static DatasetSegmentHeader stripPrefix(DatasetSegmentHeader segmentHeader) {
    final int TAG_PREFIX_LEN = TAG_PREFIX.length();
    UnaryOperator<SegmentTag> stripPrefix =
        (s) -> {
          String key = s.getKey();
          if (key.startsWith(TAG_PREFIX)) {
            s = s.toBuilder().setKey(key.substring(TAG_PREFIX_LEN)).build();
          }
          return s;
        };

    // must rebuild the header even if no tags changed
    val header =
        segmentHeader.toBuilder()
            .clearSegments()
            .addAllSegments(
                segmentHeader.getSegmentsList().stream()
                    .map(
                        segment ->
                            segment.toBuilder()
                                .clearTags()
                                .addAllTags(
                                    segment.getTagsList().stream()
                                        .map(stripPrefix)
                                        .collect(Collectors.toList()))
                                .build())
                    .collect(Collectors.toList()))
            .build();
    return header;
  }

  /**
   * Build v1 DatasetProperties message from existing v1 properties. Override particular tags with
   * values from JSON metadata. In this way we prevent customer from supplying malicious values in
   * the profile.
   */
  @VisibleForTesting
  static DatasetProperties enforceProperties(
      DatasetProperties properties, @Nullable BinMetadata metadata) {
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
    // TODO: Feels like we should do something with these
    val tags =
        maybeMetadata
            .map(BinMetadataEnforcer::collapseTagMap)
            .map(DatasetProfileMessageWrapper::extractTags)
            .orElse(ImmutableList.of());
    val timestamp =
        maybeMetadata
            .map(BinMetadata::getDatasetTimestamp)
            .orElse(properties.getDatasetTimestamp());

    Map<String, String> tagMap = BinMetadataEnforcer.collapseTagMap(metadata);
    val builder = DatasetProperties.newBuilder(properties);
    builder.putAllTags(tagMap);
    builder.setDatasetTimestamp(timestamp);
    builder.putTags(ORG_ID, orgId);
    builder.putTags(DATASET_ID, datasetId);
    Optional.ofNullable(referenceProfileId)
        .ifPresent(id -> builder.putTags(REFERENCE_PROFILE_ID, id));
    builder.putMetadata("format", WHYLOGS_VERSION1);

    return builder.build();
  }
}

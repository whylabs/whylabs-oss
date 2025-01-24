package ai.whylabs.druid.whylogs.v1;

import static ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper.TAG_PREFIX_LEN;
import static ai.whylabs.druid.whylogs.column.ProfileMetrics.COLUMN_PROFILE;
import static ai.whylabs.druid.whylogs.column.WhyLogsRow.*;
import static java.util.Collections.unmodifiableMap;

import ai.whylabs.druid.whylogs.column.DatasetProfileMessageWrapper;
import ai.whylabs.druid.whylogs.column.ProfileMetrics;
import ai.whylabs.druid.whylogs.column.WhyLogsMetrics;
import ai.whylabs.druid.whylogs.frequency.StringItemSketch;
import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer;
import ai.whylabs.druid.whylogs.operationalMetrics.Direction;
import com.google.common.io.ByteStreams;
import com.shaded.whylabs.com.google.protobuf.ByteString;
import com.shaded.whylabs.org.apache.datasketches.ArrayOfStringsSerDe;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.theta.Union;
import com.whylogs.core.ColumnProfile;
import com.whylogs.core.message.ChunkHeader;
import com.whylogs.core.message.ChunkHeader.ChunkType;
import com.whylogs.core.message.ChunkMessage;
import com.whylogs.core.message.ChunkOffsets;
import com.whylogs.core.message.DatasetProfileHeader;
import com.whylogs.core.message.DatasetSegmentHeader;
import com.whylogs.core.utils.sketches.ThetaSketch;
import com.whylogs.v0.core.message.ColumnMessageV0;
import com.whylogs.v0.core.message.Counters;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import com.whylogs.v0.core.message.FrequentItemsSketchMessageV0;
import com.whylogs.v0.core.message.HllSketchMessageV0;
import com.whylogs.v0.core.message.InferredType.Type;
import com.whylogs.v0.core.message.NumbersMessage;
import com.whylogs.v0.core.message.SchemaMessage;
import com.whylogs.v0.core.message.VarianceMessage;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.channels.Channels;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.druid.java.util.common.parsers.CloseableIterator;

/** Iterate through the contents of a WhyLogs V1 file, converting each metric to a V0 version. */
@Slf4j
public class WhyLogsV1toV0Iterator implements CloseableIterator<WhyLogsMetrics> {

  public static final String TYPES_FRACTIONAL = "types/fractional";
  public static final String TYPES_INTEGRAL = "types/integral";
  public static final String TYPES_STRING = "types/string";
  public static final String TYPES_OBJECT = "types/object";
  public static final String TYPES_BOOLEAN = "types/boolean";
  public static final String COUNTS_N = "counts/n";
  public static final String COUNTS_NULL = "counts/null";
  public static final String KLL = "distribution/kll";
  public static final String MEAN = "distribution/mean";
  public static final String VARIANCE = "distribution/m2";
  public static final String FREQUENT_STRING = "frequent_items/frequent_strings";
  public static final String HLL = "cardinality/hll";

  public static final String MAGIC_HEADER = "WHY1";
  public static final int MARK_LIMIT = 1024;
  public static final String OUTPUT_KEYWORD_CONST = "output";

  static class EndOfFileException extends IOException {}

  private static final ByteString EMPTY_FI_SKETCH =
      ByteString.copyFrom(new StringItemSketch().get().toByteArray(new ArrayOfStringsSerDe()));
  private static final ByteString EMPTY_HLL =
      ByteString.copyFrom(new HllSketch().toCompactByteArray());
  private static final ByteString EMPTY_KLL =
      ByteString.copyFrom(new KllDoublesSketch().toByteArray());
  private static final ByteString EMPTY_THETA = ThetaSketch.serialize(Union.builder().buildUnion());

  private static final int HEADER_LENGTH = MAGIC_HEADER.length();

  private final BufferedInputStream bif;
  private final Path tmpFile;
  private final SeekableByteChannel fc;
  private final InputStream seekableInputstream;

  private Iterator<Entry<String, ChunkOffsets>> columnOffsetIt = Collections.emptyIterator();
  private Map<Integer, String> indexedMetricPaths;
  private Map<String, ChunkOffsets> columnOffsets;
  private DatasetProfileHeader header;
  private DatasetSegmentHeader segmentHeader;

  private ColumnMessageV0 currentColumn;
  private BinMetadata metadata;

  public WhyLogsV1toV0Iterator(BufferedInputStream bif) throws IOException {
    this(bif, null);
  }

  public WhyLogsV1toV0Iterator(BufferedInputStream bif, @Nullable BinMetadata metadata)
      throws IOException {
    this.bif = bif;
    this.metadata = metadata;

    bif.mark(MARK_LIMIT);
    checkMagicHeader();
    bif.reset();

    // We copy the stream to the temp file so that we can randomly access the datastream. In theory
    // we can stream iterate it but it'll require a lot more logic to map each chunked message to
    // the appropriate columns. I'm just taking the shortest path here.
    this.tmpFile = Files.createTempFile("profile", ".bin");
    this.fc = Files.newByteChannel(this.tmpFile, StandardOpenOption.READ);
    this.seekableInputstream = Channels.newInputStream(this.fc);
  }

  /**
   * Temporary solution until we streamline Deltalake to align and v1. Deltalake ingestion expects a
   * v1 row content AFTER the ingestion so we basically convert v1 in v0 format this way.
   *
   * <p>This is a temporary solution and isn't meant to be the long term fix.
   *
   * <p>Note that
   *
   * @return a {@link DatasetProfileMessage} of v0 format
   */
  public DatasetProfileMessage toV0DatasetProfileMessage() {
    if (!this.hasNext()) {
      return null;
    }

    DatasetProfileHeader header = this.header;
    val properties = header.getProperties();
    Optional<BinMetadata> maybeMetadata = Optional.ofNullable(this.metadata);
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
    val traceId = properties.getMetadataMap().get(TRACE_ID);

    // tags might come from JSON (`metadata`), or from the profile header, but often the segment
    // tags are missing from the JSON metadata.
    // This code will use the tags from metadata, if available, supplemented by the V1 segment
    // header.
    Map<String, String> tagMap = BinMetadataEnforcer.collapseTagMap(metadata);
    if (segmentHeader.getHasSegments()) {
      segmentHeader.getSegmentsList().stream()
          .flatMap(s -> s.getTagsList().stream())
          .forEach(
              s -> {
                String key = s.getKey();
                if (key != null && !key.startsWith(DatasetProfileMessageWrapper.TAG_PREFIX)) {
                  key = DatasetProfileMessageWrapper.TAG_PREFIX + key;
                }
                tagMap.put(key, s.getValue());
              });
    }

    val builder = DatasetProfileMessage.newBuilder();
    val propertiesBuilder = builder.getPropertiesBuilder();
    propertiesBuilder
        .setDataTimestamp(header.getProperties().getDatasetTimestamp())
        .setSessionTimestamp(header.getProperties().getCreationTimestamp())
        .setSchemaMajorVersion(1)
        .setSchemaMinorVersion(2)
        .putAllTags(tagMap);

    // these are nullable values
    Optional.ofNullable(orgId).ifPresent(it -> propertiesBuilder.putTags(ORG_ID, orgId));
    Optional.ofNullable(datasetId)
        .ifPresent(it -> propertiesBuilder.putTags(DATASET_ID, datasetId));
    if (referenceProfileId != null) {
      propertiesBuilder.putTags(REFERENCE_PROFILE_ID, referenceProfileId);
    }
    if (traceId != null) {
      propertiesBuilder.putTags(TRACE_ID, traceId);
    }

    // iterate until we encounter a new header or the iterator is exhausted
    while (header == this.header && this.hasNext()) {
      val column = this.next();
      val profile = (ColumnProfile) column.getRaw(COLUMN_PROFILE);
      assert profile != null;
      builder.putColumns(column.getName(), profile.toProtobuf().build());
    }

    if (this.hasNext()) {
      log.error("Encounter new header in v1 format. Not supported yet");
    }

    return builder.build();
  }

  private void readHeader() throws IOException {
    bif.mark(MARK_LIMIT);
    checkMagicHeader();

    bif.mark(MARK_LIMIT);

    this.segmentHeader = DatasetSegmentHeader.parseDelimitedFrom(bif);
    if (this.segmentHeader == null) {
      log.warn("Failed to parse v1 segment header after a valid header");
      bif.reset();
      throw new IOException("Missing segment header");
    }

    this.header = DatasetProfileHeader.parseDelimitedFrom(bif);
    if (header == null || header.getSerializedSize() == 0) {
      // TBD. Something went wrong?
      throw new IOException("Expected non empty header");
    }

    // indexed metric name
    this.indexedMetricPaths = unmodifiableMap(header.getIndexedMetricPathsMap());
    this.columnOffsets = unmodifiableMap(header.getColumnOffsetsMap());
    this.columnOffsetIt = this.columnOffsets.entrySet().iterator();

    try (val os = Files.newOutputStream(tmpFile)) {
      long totalLength = header.getLength();
      //noinspection UnstableApiUsage
      ByteStreams.copy(ByteStreams.limit(bif, totalLength), os);
    }
    this.fc.position(0L);
  }

  private void checkMagicHeader() throws IOException {
    byte[] headerBuf = new byte[HEADER_LENGTH];
    int readBytes = bif.read(headerBuf);
    if (readBytes < 0) {
      throw new EndOfFileException();
    }
    if (readBytes < HEADER_LENGTH) {
      bif.reset();
      throw new IOException("Stream ends too early");
    }

    try {
      String headerText = new String(headerBuf, StandardCharsets.UTF_8);
      if (!MAGIC_HEADER.equals(headerText)) {
        throw new IOException("Invalid header marker");
      }
    } catch (Exception e) {
      bif.reset();
      throw new IOException("Failed to check the header text.", e);
    }
  }

  private void doAdvance() {
    if (!columnOffsetIt.hasNext()) {
      this.currentColumn = null;

      try {
        readHeader();
      } catch (EndOfFileException e) {
        log.debug("Reached end of file. Nothing else to do.");
        return;
      } catch (IOException e) {
        log.error("Error while parsing V1 profile - " + e.getMessage());
        return;
      }
    }

    if (!columnOffsetIt.hasNext()) {
      return;
    }

    val offsetEntry = columnOffsetIt.next();

    val schemaBuilder = SchemaMessage.newBuilder();
    val countsBuilder = Counters.newBuilder();
    val numbersMessageBuilder =
        NumbersMessage.newBuilder().setCompactTheta(EMPTY_THETA).setHistogram(EMPTY_KLL);
    val varianceMessageBuilder = VarianceMessage.newBuilder();
    val fiBuilder = FrequentItemsSketchMessageV0.newBuilder().setSketch(EMPTY_FI_SKETCH);
    val hll = HllSketchMessageV0.newBuilder().setSketch(EMPTY_HLL);

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

      for (val metricEntry : chunkMessage.getMetricComponentsMap().entrySet()) {
        Integer key = metricEntry.getKey();
        String metricPath = this.indexedMetricPaths.get(key);
        if (metricPath == null) {
          log.warn("Missing metric path for metric index: %d", key);
          continue;
        }

        long longValue = metricEntry.getValue().getN();
        switch (metricPath) {
          case TYPES_FRACTIONAL:
            schemaBuilder.putTypeCounts(Type.FRACTIONAL_VALUE, longValue);
            break;
          case TYPES_INTEGRAL:
            schemaBuilder.putTypeCounts(Type.INTEGRAL_VALUE, longValue);
            break;
          case TYPES_STRING:
            schemaBuilder.putTypeCounts(Type.STRING_VALUE, longValue);
            break;
          case TYPES_OBJECT:
            schemaBuilder.putTypeCounts(Type.UNKNOWN_VALUE, longValue);
            break;
          case TYPES_BOOLEAN:
            schemaBuilder.putTypeCounts(Type.BOOLEAN_VALUE, longValue);
            break;
          case COUNTS_N:
            varianceMessageBuilder.setCount(longValue);
            countsBuilder.setCount(longValue);
            break;
          case COUNTS_NULL:
            // don't set the nullCount here or we'll double count
            schemaBuilder.putTypeCounts(Type.NULL_VALUE, longValue);
            break;
          case KLL:
            numbersMessageBuilder.setHistogram(metricEntry.getValue().getKll().getSketch());
            break;
          case MEAN:
            varianceMessageBuilder.setMean(metricEntry.getValue().getD());
            break;
          case VARIANCE:
            varianceMessageBuilder.setSum(metricEntry.getValue().getD());
            break;
          case FREQUENT_STRING:
            fiBuilder
                .setSketch(metricEntry.getValue().getFrequentItems().getSketch())
                .setLgMaxK(12);
            break;
          case HLL:
            hll.setSketch(metricEntry.getValue().getHll().getSketch());
            break;

          default:
            log.debug("Unsupported metric path: %s", metricPath);
        }
      }
    }

    this.currentColumn =
        ColumnMessageV0.newBuilder()
            .setName(offsetEntry.getKey())
            .setCardinalityTracker(hll)
            .setCounters(countsBuilder)
            .setFrequentItems(fiBuilder)
            .setNumbers(numbersMessageBuilder.setVariance(varianceMessageBuilder))
            .setSchema(schemaBuilder)
            .build();
  }

  @Override
  public boolean hasNext() {
    if (this.currentColumn == null) {
      doAdvance();
    }

    if (this.currentColumn == null) {
      this.closeQuietly();
    }

    return this.currentColumn != null;
  }

  @Override
  public WhyLogsMetrics next() {
    ColumnMessageV0 currentColumn = this.currentColumn;
    this.currentColumn = null;

    Direction direction = Direction.INPUT;
    if (currentColumn != null
        && currentColumn.getName() != null
        && currentColumn.getName().contains(OUTPUT_KEYWORD_CONST)) {
      direction = Direction.OUTPUT;
    }

    val properties = this.header.getProperties();
    Optional<BinMetadata> maybeMetadata = Optional.ofNullable(this.metadata);
    val timestamp =
        maybeMetadata
            .map(BinMetadata::getDatasetTimestamp)
            .orElse(properties.getDatasetTimestamp());
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

    // Format segment tags for V0-style profile header.
    // Segment tags can come from JSON (`metadata`), or from the segmentHeader.  Often the segment
    // tags are missing from the JSON metadata.  This code will use the tags from metadata, if
    // available, supplemented by the V1 segment header.
    val tagsMap = maybeMetadata.map(BinMetadataEnforcer::collapseTagMap).orElse(new HashMap<>());
    if (segmentHeader.getHasSegments()) {
      segmentHeader.getSegmentsList().stream()
          .flatMap(s -> s.getTagsList().stream())
          .forEach(
              tag -> {
                String key = tag.getKey();
                if (key != null && !key.startsWith(DatasetProfileMessageWrapper.TAG_PREFIX)) {
                  key = DatasetProfileMessageWrapper.TAG_PREFIX + key;
                }
                tagsMap.put(key, tag.getValue());
              });
    }

    // all keys in `tagsMap` are expected to be prefixed by TAG_PREFIX
    val tags =
        tagsMap.entrySet().stream()
            .map(e -> e.getKey().substring(TAG_PREFIX_LEN) + "=" + e.getValue())
            .collect(Collectors.toList());

    return new ProfileMetrics(
        timestamp, orgId, datasetId, referenceProfileId, tags, currentColumn, direction);
  }

  void closeQuietly() {
    try {
      this.close();
    } catch (Exception e) {
      log.warn("Failed to close iterator: " + e.getMessage());
    }
  }

  @Override
  public void close() throws IOException {
    if (this.seekableInputstream != null) {
      this.seekableInputstream.close();
    }
    Files.deleteIfExists(this.tmpFile);
  }
}

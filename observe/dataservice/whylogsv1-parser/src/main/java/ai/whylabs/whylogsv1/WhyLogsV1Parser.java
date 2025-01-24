package ai.whylabs.whylogsv1;

import static ai.whylabs.whylogsv1.util.SuperSimpleInternalMetrics.METRICS;
import static java.util.Collections.unmodifiableMap;

import ai.whylabs.whylogsv1.metrics.Variance.VarianceBuilder;
import ai.whylabs.whylogsv1.metrics.WhyLogMetric;
import com.shaded.whylabs.com.google.common.io.ByteStreams;
import com.whylogs.core.message.ChunkHeader;
import com.whylogs.core.message.ChunkMessage;
import com.whylogs.core.message.ChunkOffsets;
import com.whylogs.core.message.DatasetProfileHeader;
import com.whylogs.core.message.DatasetSegmentHeader;
import com.whylogs.core.message.MetricComponentMessage;
import java.io.BufferedInputStream;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.Channels;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.NoSuchElementException;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

/**
 * Parse a WhyLogsV1 file into instances of {@link WhyLogMetric} in a memory-conserving way.
 *
 * <p>Not thread safe.
 */
@Slf4j
public class WhyLogsV1Parser implements Iterator<WhyLogMetric>, Closeable {

  public static final String MAGIC_HEADER = "WHY1";
  public static final int MARK_LIMIT = 1024;
  private static final int HEADER_LENGTH = MAGIC_HEADER.length();
  private final BufferedInputStream bufferedInputStream;

  private final Path tmpFile;
  private final SeekableByteChannel fc;
  private final InputStream seekableInputStream;
  // Index of metric types and their integer representations within the file
  private Map<Integer, String> indexedMetricPaths;

  private boolean hasBeenClosed = false;

  // Iterator of ZWhyLogMetrics to be returned in this iterator
  private Iterator<WhyLogMetric> iterator = Collections.emptyIterator();

  // Iterator of chunks from which we populate the above metricsIterator
  private Iterator<Entry<String, ChunkOffsets>> chunksIterator = Collections.emptyIterator();

  public WhyLogsV1Parser(BufferedInputStream bufferedInputStream) throws IOException {
    this.bufferedInputStream = bufferedInputStream;
    // TODO: See if we can move this into memory
    // We copy the stream to the temp file so that we can randomly access the datastream. In theory
    // we can stream iterate it but it'll require a lot more logic to map each chunked message to
    // the appropriate columns. I'm just taking the shortest path here.
    this.tmpFile = Files.createTempFile("profile", ".bin");
    this.fc = Files.newByteChannel(this.tmpFile, StandardOpenOption.READ);
    this.seekableInputStream = Channels.newInputStream(this.fc);

    bufferedInputStream.mark(MARK_LIMIT);
    checkMagicHeader(this.bufferedInputStream);
  }

  /**
   * Verify that the provided InputStream claims to be a WhyLogsV1 format.
   *
   * @throws IOException in the case that we don't find the magic header
   */
  private void checkMagicHeader(BufferedInputStream bis) throws IOException {
    byte[] headerBuf = new byte[HEADER_LENGTH];
    int readBytes;
    try {
      readBytes = bis.read(headerBuf);

    } catch (IOException ioe) {
      throw new BadHeaderException("Couldn't read file", ioe);
    }

    if (readBytes < 0) {
      throw new BadHeaderException("Couldn't read any bytes");
    }

    if (readBytes < HEADER_LENGTH) {
      throw new BadHeaderException("Stream ends too early");
    }

    String headerText = new String(headerBuf, StandardCharsets.UTF_8);
    if (!MAGIC_HEADER.equals(headerText)) {
      throw new BadHeaderException("Invalid header marker");
    }
  }

  /**
   * * Read a {@link DatasetSegmentHeader} from the provided BufferInputStream, returning an
   * iterator to the column offsets it contains, as well as configuring the underlying InputStreams
   * to be parsed. If no more datasegment headers can be read, return an empty iterator (but we
   * currently do not do any clean up of the underying buffers) to indicate that we've reached the
   * likely end of the file.
   *
   * <p>This method mutates several components of the internal class when it's called.
   *
   * @param bis InputStream that should contain a DataSegmentHeader
   * @return Iterator of metrics to their ChunkOffsets, or an empty iterator if no header could be
   *     read.
   * @throws IOException in the event of anything IO-y going wrong.
   */
  private Iterator<Entry<String, ChunkOffsets>> readDataSegmentHeader(BufferedInputStream bis)
      throws IOException {
    DatasetSegmentHeader datasetSegmentHeader = DatasetSegmentHeader.parseDelimitedFrom(bis);
    if (datasetSegmentHeader == null) {
      log.debug("Could not read datasegment header. Returning");
      return Collections.emptyIterator();
    }
    METRICS().increment("num_datasegment_headers_read");

    if (datasetSegmentHeader.getHasSegments()) {
      log.warn("Segments not supported yet. Will treat segments as separate profiles.");
    }

    DatasetProfileHeader datasetProfileHeader = DatasetProfileHeader.parseDelimitedFrom(bis);
    if (datasetProfileHeader == null || datasetProfileHeader.getSerializedSize() == 0) {
      throw new IllegalStateException("Unable to read dataset profile header, or it's empty");
    }

    long totalLength = datasetProfileHeader.getLength();
    try (OutputStream outputStream = Files.newOutputStream(tmpFile)) {
      ByteStreams.copy(ByteStreams.limit(bis, totalLength), outputStream);
    }

    // Indexed metric name
    this.indexedMetricPaths = unmodifiableMap(datasetProfileHeader.getIndexedMetricPathsMap());
    Map<String, ChunkOffsets> columnOffsetsMap =
        unmodifiableMap(datasetProfileHeader.getColumnOffsetsMap());

    this.fc.position(0l);

    return columnOffsetsMap.entrySet().iterator();
  }

  /**
   * * Obtain a valid iterator to more metrics, or if there are none, an empty iterator, which
   * indicates we've come to the end of the file. This method mutates several pieces of internal
   * state and should be the only place in which they are adjusted.
   *
   * @return Iterator to next batch of parsed metrics.
   * @throws IOException in the event of bad things happening while we're parsing.
   */
  public Iterator<WhyLogMetric> getMetricsIterator() throws IOException {
    assert !iterator.hasNext() : "Should only be getting a new iterator if old one is empty";

    // Check if we still have more chunk offsets to read from current bunch
    if (!chunksIterator.hasNext()) {
      // Try to read in another chunk of offsets
      chunksIterator = readDataSegmentHeader(this.bufferedInputStream);
      if (!chunksIterator.hasNext()) {
        // If we still don't have any, we're at the end of the file
        return Collections.emptyIterator();
      }
    }

    // Deserialize out the next group of metrics from these chunks.
    // Note: If we wanted to optimize for throughput, we could consume this entire iterator in this
    // call to getsMetricIterator, at the expense of holding more data in memory.
    Entry<String, ChunkOffsets> nextChunk = chunksIterator.next();

    String columnName = nextChunk.getKey();

    ChunkOffsets chunkOffsets = nextChunk.getValue();

    List<WhyLogMetric> metrics = new ArrayList<>();

    VarianceBuilder varianceBuilder = new VarianceBuilder();

    for (long offset : chunkOffsets.getOffsetsList()) {
      METRICS().increment("num_chunkoffsets");
      this.fc.position(offset);
      ChunkHeader chunkHeader = ChunkHeader.parseDelimitedFrom(this.seekableInputStream);

      InputStream lengthLimitedStream =
          ByteStreams.limit(this.seekableInputStream, chunkHeader.getLength());
      ChunkMessage chunkMessage = ChunkMessage.parseFrom(lengthLimitedStream);

      Map<Integer, MetricComponentMessage> metricComponentsMap =
          chunkMessage.getMetricComponentsMap();
      for (Entry<Integer, MetricComponentMessage> metricComponentMessageEntry :
          metricComponentsMap.entrySet()) {

        int key = metricComponentMessageEntry.getKey();
        String metricPath = this.indexedMetricPaths.get(key); // TODO: Check for null

        metrics.addAll(
            WhyLogMetric.whyLogMetricsFromMetricComponentMessages(
                columnName, metricPath, metricComponentMessageEntry.getValue(), varianceBuilder));
      }
    }

    varianceBuilder.squashVarianceComponents(columnName).ifPresent(metrics::add);

    return metrics.iterator();
  }

  /**
   * Check if there are more metrics available in this WhyLogsV1 file.
   *
   * @return True if there are more metrics available.
   */
  @SneakyThrows
  @Override
  public boolean hasNext() {
    checkIfClosed();

    // Check if we have some metrics queued up to return
    if (iterator.hasNext()) {
      return true;
    }

    // If not, see if we can dig up some more
    iterator = getMetricsIterator();

    return iterator.hasNext();
  }

  /**
   * Retrieve the next metric, or throw an exception is there is none.
   *
   * @return Next metric or exception.
   */
  @Override
  public WhyLogMetric next() {
    checkIfClosed();

    if (hasNext()) {
      return iterator.next();
    } else {
      throw new NoSuchElementException();
    }
  }

  /**
   * Since we implement Closeable, make sure we haven't been closed since calls to the Iterator
   * methods should fail in that case.
   *
   * @throws IllegalStateException If close has already been called.
   */
  private void checkIfClosed() throws IllegalStateException {
    if (hasBeenClosed) {
      throw new IllegalStateException("Has already been closed.");
    }
  }

  /**
   * * Close all the underlying closeable datastructures we're using.
   *
   * @throws IOException in the event of an underlying data structure having trouble closing.
   */
  public void close() throws IOException {
    this.hasBeenClosed = true;
    if (this.bufferedInputStream != null) {
      this.bufferedInputStream.close();
    }
    if (this.fc != null) {
      this.fc.close();
    }
  }
}

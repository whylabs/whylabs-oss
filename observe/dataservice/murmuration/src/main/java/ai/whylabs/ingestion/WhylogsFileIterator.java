package ai.whylabs.ingestion;

import static ai.whylabs.druid.whylogs.metadata.BinMetadataEnforcer.MAPPER;
import static com.google.common.collect.Iterators.singletonIterator;
import static java.util.Objects.isNull;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import com.amazonaws.services.s3.AmazonS3;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.ImmutableMap;
import java.io.BufferedInputStream;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Iterator;
import java.util.NoSuchElementException;
import lombok.Getter;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.io.IOUtils;
import org.apache.druid.java.util.common.parsers.CloseableIterator;

/**
 * Implements {@link Closeable} {@link Iterator} that returns batches of V1 metrics from both V0 and
 * V1-format profiles.
 *
 * <p>Construct with just a URL using either {@code file:} or {{@code s3:} schema, will fetch the
 * file contents, decode sufficiently to determine whylogs version, and iterate over the contents.
 * At any time after first iteration, V1-format properties may be retrieved with {@code
 * getProperties()}.
 *
 * <p>Implements Iterator of Iterators. top-level iterates over delimited regions within a file (V0
 * profiles have only one delimited region). Second-level iterates over features within the region,
 * returning one Pair for each feature.
 *
 * <p>For each top-level iteration, dataset headers may be retrieved. Those headers apply to all
 * items in the second-level iteration.
 *
 * <pre>{@code
 * try (val fit = new WhylogsFileIterator("s3://bucket/prefix/profile.bin")) {
 *   while (fit.hasNext()) {
 *     val mit = fit.next(); // metric iterator
 *     val properties = fit.getProperties();
 *     publish(properties, mit);
 *   }
 * }
 * }</pre>
 *
 * @since 1.8
 */
@Slf4j
public class WhylogsFileIterator implements CloseableIterator<IMetricsIterator> {
  public static final String INTERNAL_PREFIX = "__internal_";
  public static final String META_URI = INTERNAL_PREFIX + "uri";
  public static final String META_SIZE = INTERNAL_PREFIX + "size";
  public static final String META_MODIFIED = INTERNAL_PREFIX + "modified";

  public static final String JSON_EXTENSION = ".json";
  public static final String UNTRUSTED_S3_PREFIX = "daily-log-untrusted";
  public static final String SINGLE_REF_S3_PREFIX = "reference-profiles";
  public static final String ZIP_EXTENSION = ".zip";

  private static final int MARK_READ_LIMIT = 128;
  private static final int BUFFER_SIZE = 1024;

  private final URI uri;
  private final S3ClientFactory s3ClientFactory;
  private boolean hasBeenClosed = false;

  private BinMetadata metadata;
  private BufferedInputStream bis;
  private InputStream is;
  @Getter private Long modifiedTimestamp;
  @Getter private Long length;

  Iterator<BufferedInputStream> streamsIterator;
  IMetricsIterator currentIterator;

  // expects URL encoded string like "s3://bucket/prefix/profile.bin" or "file:/path/profile.bin"
  public WhylogsFileIterator(URL url) {
    this(url.toString(), null);
  }

  @SneakyThrows
  public WhylogsFileIterator(String name, AmazonS3 s3) {
    this.uri = URI.create(name);
    this.s3ClientFactory = new S3ClientFactory(s3);

    val is = fetchProfileStream();
    val metadata = fetchMetadata();
    val path = uri.getPath();
    if (isNull(metadata)) {
      if (path.contains(UNTRUSTED_S3_PREFIX) || path.contains(SINGLE_REF_S3_PREFIX)) {
        log.warn("Cannot proceed without metadata \"{}\"", path);
        if (is != null) is.close();
      }
    }
    this.is = is;
    this.metadata = metadata;
    if (is != null && is.available() > 0) {
      bis = new BufferedInputStream(is);

      // Make an iterator over all the entries in the zip file.
      // If not a zip file, make an iterator over the single stream.
      if (path.endsWith(ZIP_EXTENSION)) {
        // note: timestamp will be taken from shared json metadata, so profiles within zip must
        // cover identical dataset
        // timestamp. Each may have its own segment tags.
        streamsIterator = new ZipIterator(bis);
      } else {
        streamsIterator = singletonIterator(bis);
      }
    }
  }

  /**
   * Returns true if there are more metrics in the stream to be iterated, false otherwise. Handles
   * both V0- and V1- style profiles. Throws exception if unable to parse input.
   *
   * <p>throws unchecked RuntimeException to conform with Iterator interface.
   */
  @Override
  public boolean hasNext() {
    checkIfClosed();
    if (currentIterator == null) {
      if (streamsIterator.hasNext()) {
        val currentStream = streamsIterator.next();

        if (V1ChunkIterator.isV1Format(currentStream)) {
          try {
            currentIterator = new V1ChunkIterator(currentStream, metadata, uri.getPath());
          } catch (Exception e) {
            // we don't expect exception if stream has already identified as V1 format.
            throw new RuntimeException(e);
          }
        } else {
          try {
            currentIterator = new V0toV1StreamIterator(currentStream, metadata);
          } catch (Exception e) {
            // last chance parse - expect exception if stream is not V0 format
            throw new RuntimeException(e);
          }
        }
      }
    }

    if (currentIterator != null) return currentIterator.hasNext();

    return false;
  }

  @Override
  public IMetricsIterator next() {
    checkIfClosed();
    if (currentIterator != null) {
      val result = currentIterator;
      currentIterator = null;
      return result;
    } else {
      throw new NoSuchElementException();
    }
  }

  /**
   * Given a URI (S3: or file:), fetch an input stream of the contents, plus metadata about the
   * file.
   */
  @VisibleForTesting
  @SneakyThrows(IOException.class)
  InputStream fetchProfileStream() {
    InputStream is = null;
    switch (uri.getScheme()) {
      case "s3":
        val obj = s3ClientFactory.get(uri.toString());
        if (obj != null) {
          is = obj.getContentStream();
          modifiedTimestamp = obj.getModifiedTimestamp();
          length = obj.getContentLength();
        }
        break;

      case "file":
        val path = Paths.get(uri);
        is = Files.newInputStream(path);
        val attr = Files.readAttributes(path, BasicFileAttributes.class);
        modifiedTimestamp = attr.lastModifiedTime().toMillis();
        length = attr.size();
        break;
    }

    return is;
  }

  /**
   * Given a profile URI, fetch JSON metadata supplied to REST api when the profile was uploaded.
   * Metadata file has same name as original profile, with .bin extension replace with .json. Can
   * handle S3: in production, or file: URIs for testing.
   */
  @VisibleForTesting
  BinMetadata fetchMetadata() {
    try (InputStream is = openMetadataStream()) {
      if (is != null) {
        return MAPPER.readValue(IOUtils.toString(is, StandardCharsets.UTF_8), BinMetadata.class);
      }
    } catch (IOException e) {
      log.trace("fetchMetadata \"{}\" - {}", uri.toString(), e.getMessage());
      return null;
    }
    return null;
  }

  InputStream openMetadataStream() throws IOException {
    InputStream is = null;
    String metadataPath = uri.toString();
    metadataPath = metadataPath.substring(0, metadataPath.lastIndexOf(".")) + JSON_EXTENSION;

    switch (uri.getScheme()) {
      case "s3":
        val S3Obj = s3ClientFactory.get(metadataPath);
        if (S3Obj != null) {
          is = S3Obj.getContentStream();
        }
        break;

      case "file":
        // file: scheme generated by Class.getResource() in unit tests
        val path = Paths.get(URI.create(metadataPath));
        is = Files.newInputStream(path);
        break;
    }
    return is;
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
    if (this.bis != null) {
      this.bis.close();
    }
  }

  /**
   * Return metadata derived about the incoming file. If we are decoding a zip file, return info for
   * the current entry within the zip.
   */
  public ImmutableMap<String, String> getMetadata() {
    String path = uri.toString();
    Long size = length;
    if (path.endsWith(ZIP_EXTENSION)) {
      // entries within zip will embed entry name in parens,e.g.
      // "s3://backet/prefix/someprofile.zip(entryname)"
      val zipIt = (ZipIterator) streamsIterator;
      path = path + "(" + zipIt.entryName() + ")";
      size = zipIt.entrySize();
    }
    return ImmutableMap.<String, String>builder()
        .put(META_URI, path)
        .put(META_SIZE, size.toString())
        .put(META_MODIFIED, modifiedTimestamp.toString())
        .build();
  }
}

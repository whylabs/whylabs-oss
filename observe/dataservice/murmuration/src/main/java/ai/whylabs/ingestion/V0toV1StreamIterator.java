package ai.whylabs.ingestion;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import com.google.common.collect.Iterators;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.message.ColumnMessage;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import javax.annotation.Nullable;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;

@Slf4j
public class V0toV1StreamIterator implements IMetricsIterator {

  // Magic header for whylogs using the first 4 bytes
  private static final String WHYLOGS_MAGIC_HEADER = "WHY1";
  private static final byte[] WHYLOGS_MAGIC_HEADER_BYTES =
      WHYLOGS_MAGIC_HEADER.getBytes(StandardCharsets.UTF_8);
  private static final int MARK_READ_LIMIT = 128;

  private final BufferedInputStream bis;
  private final BinMetadata metadata;

  private Iterator<Pair<String, ColumnMessage>> it = null;
  private DatasetProfileMessage msg = null;
  private V1Metadata v1header;

  public V0toV1StreamIterator(BufferedInputStream bis, @Nullable BinMetadata metadata)
      throws IOException {
    this.bis = bis;
    this.metadata = metadata;

    // Since there is no magic-byte or other method to validate a V0 profile,
    // short of reading it into memory, parse the profile before creating the iterator.
    // That way we can fail-fast on garbage bytes.
    bis.mark(MARK_READ_LIMIT);
    int readByte = bis.read();
    bis.reset();

    if (readByte < 0) {
      throw new IOException("Stream is empty");
    }

    try {
      bis.mark(MARK_READ_LIMIT);
      this.msg = DatasetProfileMessage.parseDelimitedFrom(bis);
    } catch (InvalidProtocolBufferException pe) {
      bis.reset();
    }

    if (this.msg == null) {
      try {
        bis.mark(MARK_READ_LIMIT);
        this.msg = DatasetProfileMessage.parseFrom(bis);
      } catch (InvalidProtocolBufferException pe) {
        bis.reset();
      }
    }

    if (msg == null) {
      // parseDelimitedFrom returns null once there's no more records in
      // the delimited stream.
      // also protects against malicious files being passed in as profiles.
      throw new IllegalArgumentException("Stream does not contain V0 profile");
    }
  }

  @SneakyThrows
  @Override
  public boolean hasNext() {
    if (it == null) {
      this.v1header = new V1Metadata(msg.getProperties(), metadata);
      it =
          Iterators.concat(
              new V0toV1DatasetIterator(v1header, msg.getModeProfile().getMetrics()),
              new V0toV1ColumnsIterator(msg.getColumnsMap()));
    }

    return it.hasNext();
  }

  @Override
  public Pair<String, ColumnMessage> next() {
    return it.next();
  }

  @Override
  public V1Metadata getMetadata() {
    return v1header;
  }
}

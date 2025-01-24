package ai.whylabs.druid.whylogs.frequency;

import it.unimi.dsi.fastutil.bytes.ByteArrays;
import java.nio.ByteBuffer;
import org.apache.druid.segment.data.ObjectStrategy;

public class FrequencyObjectStrategy implements ObjectStrategy<StringItemSketch> {

  @Override
  public StringItemSketch fromByteBuffer(final ByteBuffer buffer, final int numBytes) {
    if (numBytes == 0) {
      return FrequencyOperations.EMPTY_COLUMN;
    }

    final byte[] bytes = new byte[numBytes];
    buffer.get(bytes, 0, numBytes);

    return FrequencyOperations.deserializeFromByteArray(bytes);
  }

  @Override
  public Class<StringItemSketch> getClazz() {
    return StringItemSketch.class;
  }

  @Override
  public byte[] toBytes(final StringItemSketch msg) {
    if (msg == null) {
      return ByteArrays.EMPTY_ARRAY;
    }
    return FrequencyOperations.serialize(msg);
  }

  @Override
  public int compare(StringItemSketch o1, StringItemSketch o2) {
    Integer a = o1.get().getNumActiveItems();
    Integer b = o2.get().getNumActiveItems();
    return a.compareTo(b);
  }
}

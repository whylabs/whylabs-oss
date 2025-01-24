package ai.whylabs.druid.whylogs.variance;

import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import com.whylogs.v0.core.message.VarianceMessage;
import java.nio.ByteBuffer;
import lombok.val;
import org.apache.druid.segment.data.ObjectStrategy;

public class VarianceObjectStrategy implements ObjectStrategy<VarianceTracker> {

  @Override
  public int compare(final VarianceTracker s1, final VarianceTracker s2) {
    return MergeAggregatorFactory.COMPARATOR.compare(s1, s2);
  }

  @Override
  public VarianceTracker fromByteBuffer(final ByteBuffer buffer, final int numBytes) {
    if (numBytes == 0) {
      return VarianceOperations.EMPTY_TRACKER;
    }

    final byte[] bytes = new byte[numBytes];
    buffer.get(bytes, 0, numBytes);
    try {
      val msg = VarianceMessage.parseFrom(bytes);
      return VarianceTracker.fromProtobuf(msg);
    } catch (InvalidProtocolBufferException e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public Class<VarianceTracker> getClazz() {
    return VarianceTracker.class;
  }

  @Override
  public byte[] toBytes(final VarianceTracker sketch) {
    if (sketch == null) {
      return VarianceOperations.EMPTY_TRACKER.toProtobuf().build().toByteArray();
    }
    return sketch.toProtobuf().build().toByteArray();
  }
}

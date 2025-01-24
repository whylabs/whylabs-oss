package ai.whylabs.batch.aggregators;

import ai.whylabs.core.utils.BinParser;
import com.whylogs.core.DatasetProfile;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

/** UDAF to merge full profiles */
@Slf4j
public class ProfileMergeAggregator extends Aggregator<byte[], byte[], byte[]> {

  @Override
  public byte[] zero() {
    return new byte[0];
  }

  @Override
  public byte[] reduce(byte[] a, byte[] b) {
    return merge(a, b);
  }

  @SneakyThrows
  @Override
  public byte[] merge(byte[] a, byte[] b) {
    if (b == null || b.length == 0) {
      return a;
    }
    if (a == null || a.length == 0) {
      return b;
    }

    val daMsg = BinParser.parse(a);
    val dbMsg = BinParser.parse(b);
    /** Prevent corrupt files from breaking monitor * */
    if (daMsg == null) {
      return b;
    }
    if (dbMsg == null) {
      return a;
    }

    /** Schemas before version 1 aren't supported, skip the merge */
    if (daMsg.getProperties().getSchemaMajorVersion() < 1
        || dbMsg.getProperties().getSchemaMajorVersion() < 1) {
      return new byte[0];
    }

    val da = DatasetProfile.fromProtobuf(BinParser.parse(a));
    val db = DatasetProfile.fromProtobuf(BinParser.parse(b));

    try {
      val merged = da.merge(db);
      return merged.toBytes();
    } catch (Exception e) {
      log.error(
          "Could not merge two profiles " + da.getTags() + " ------ " + db.getDataTimestamp(), e);
      return a;
    }
  }

  @Override
  public byte[] finish(byte[] reduction) {
    return reduction;
  }

  @Override
  public Encoder<byte[]> bufferEncoder() {
    return Encoders.BINARY();
  }

  @Override
  public Encoder<byte[]> outputEncoder() {
    return Encoders.BINARY();
  }
}

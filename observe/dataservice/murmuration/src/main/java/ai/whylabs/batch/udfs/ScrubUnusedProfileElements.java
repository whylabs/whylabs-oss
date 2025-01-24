package ai.whylabs.batch.udfs;

import ai.whylabs.core.enums.ProfileColumnType;
import ai.whylabs.druid.whylogs.util.ValidateDelimitedProtoDeserializationPredicate;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.shaded.whylabs.org.apache.datasketches.theta.Union;
import com.whylogs.core.utils.sketches.ThetaSketch;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.spark.sql.api.java.UDF2;

/**
 * Our old char count sketch is bloated and unused. Also the compactTheta in number tracker never
 * gets used. Together these account for %75 of our profile storage, so clearing them out saves us a
 * lot of IO/CPU/Storage and hopefully help us get past some datalake writer/compaction job OOMs.
 */
@Slf4j
public class ScrubUnusedProfileElements implements UDF2<byte[], String, byte[]> {
  public static final String name = "scrub";

  @SneakyThrows
  public static DatasetProfileMessage scrub(DatasetProfileMessage message) {
    val builder = message.toBuilder().clearColumns();
    Union u = Union.builder().buildUnion();
    val emptyTheta = ThetaSketch.serialize(u);

    for (val e : message.getColumnsMap().entrySet()) {
      val colMessage = e.getValue().toBuilder().clearStrings();
      // Lot of the deserialization code doesn't want null bytearrays so empty sketch is preferred
      val n = e.getValue().getNumbers().toBuilder().setCompactTheta(emptyTheta).build();
      colMessage.setNumbers(n);
      builder.putColumns(e.getKey(), colMessage.build());
    }
    return builder.build();
  }

  @Override
  public byte[] call(byte[] bytes, String type) throws Exception {
    if (ProfileColumnType.RAW.equals(ProfileColumnType.valueOf(type))) {
      return new byte[0];
    }

    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    val p = new ValidateDelimitedProtoDeserializationPredicate();

    try {
      // Scrub data
      try {
        DatasetProfileMessage msg =
            DatasetProfileMessage.parseDelimitedFrom(new ByteArrayInputStream(bytes));
        if (!p.test(msg)) {
          msg = DatasetProfileMessage.parseFrom(new ByteArrayInputStream(bytes));
        }
        if (msg != null) {
          msg = scrub(msg);
          msg.writeDelimitedTo(bos);
        } else {
          return bytes;
        }
      } catch (InvalidProtocolBufferException e) {
        try {
          // For a while whylogs python didn't write out delimited so we have a fallback
          while (true) {
            val next = DatasetProfileMessage.parseFrom(new ByteArrayInputStream(bytes));
            if (next == null) {
              break;
            }
            scrub(next).writeDelimitedTo(bos);
          }
        } catch (InvalidProtocolBufferException e2) {
          log.error("Invalid protobuf byte array. Possible corrupted file upload.", e2);
        }
      }
    } finally {
      bos.close();
    }
    return bos.toByteArray();
  }
}

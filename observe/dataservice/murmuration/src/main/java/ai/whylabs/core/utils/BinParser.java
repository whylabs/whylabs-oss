package ai.whylabs.core.utils;

import ai.whylabs.druid.whylogs.util.ValidateDelimitedProtoDeserializationPredicate;
import com.shaded.whylabs.com.google.protobuf.InvalidProtocolBufferException;
import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.io.ByteArrayInputStream;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class BinParser {

  @SneakyThrows
  public static DatasetProfileMessage parse(byte[] bytes) {
    DatasetProfileMessage profileMessage = null;
    val p = new ValidateDelimitedProtoDeserializationPredicate();
    try {
      profileMessage = DatasetProfileMessage.parseDelimitedFrom(new ByteArrayInputStream(bytes));
      if (!p.test(profileMessage)) {
        profileMessage = DatasetProfileMessage.parseFrom(new ByteArrayInputStream(bytes));
      }
    } catch (InvalidProtocolBufferException e) {
      try {
        // For a while whylogs python didn't write out delimited so we have a fallback
        profileMessage = DatasetProfileMessage.parseFrom(new ByteArrayInputStream(bytes));
      } catch (InvalidProtocolBufferException e2) {
        log.error("Invalid protobuf byte array. Possible corrupted file upload.", e2);
      }
    }
    return profileMessage;
  }
}

package ai.whylabs.druid.whylogs.util;

import com.whylogs.v0.core.message.DatasetProfileMessage;
import java.util.function.Predicate;
import org.apache.commons.lang3.StringUtils;

/**
 * We hit a corner case where a non-delimited profile doesn't throw the
 * InvalidProtocolBufferException so we have special handling if everything deserializes as null to
 * retry that as a non-delimited.
 */
public class ValidateDelimitedProtoDeserializationPredicate
    implements Predicate<DatasetProfileMessage> {

  @Override
  public boolean test(DatasetProfileMessage msg) {
    if (msg != null
        && msg.getProperties() != null
        && msg.getColumnsMap() != null
        && msg.getModeProfile() != null
        && StringUtils.isEmpty(msg.getProperties().getSessionId())
        && msg.getColumnsMap().size() == 0
        && msg.getModeProfile().getOutputFieldsCount() == 0
        && !msg.getModeProfile().hasMetrics()) {
      return false;
    }
    return true;
  }
}

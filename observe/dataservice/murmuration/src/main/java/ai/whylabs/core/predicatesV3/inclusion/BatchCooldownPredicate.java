package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.structures.QueryResultStructure;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;
import lombok.val;

/**
 * As the setting is described "Any batch involved in the calculation must have received the last
 * profile by the duration."
 *
 * <p>What we're trying to solve with this is that we have no idea when uploading will be done for a
 * batch. For clients like Nord they allot 15min after the top of the hour to upload for a streaming
 * batch so in their case we would want to defer processing the hour until a duration amount of time
 * after they've stopped uploading data.
 *
 * <p>Basically is there a chance they're still uploading data for any of the datapoints?
 */
@AllArgsConstructor
public class BatchCooldownPredicate implements BiPredicate<List<QueryResultStructure>, Analyzer> {

  private ZonedDateTime currentTime;

  /**
   * This is a gate, returns true if the calculation may proceed. False if any datapoint was
   * received an upload too recently.
   */
  public boolean test(List<QueryResultStructure> rows, Analyzer analyzer) {
    if (analyzer.getBatchCoolDownPeriod() == null) {
      return true;
    }
    long cutoff = currentTime.minus(analyzer.getBatchCoolDownPeriod()).toInstant().toEpochMilli();

    for (val r : rows) {
      if (r.getLastUploadTs() != null && r.getLastUploadTs() > cutoff) {
        return false;
      }
    }
    return true;
  }

  public boolean test(ZonedDateTime lastUpload, Analyzer analyzer) {
    if (analyzer.getBatchCoolDownPeriod() == null || lastUpload == null) {
      return true;
    }
    val cutoff = currentTime.minus(analyzer.getBatchCoolDownPeriod());
    if (lastUpload.isAfter(cutoff)) {
      return false;
    }
    return true;
  }
}

package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import java.time.ZonedDateTime;
import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;

/**
 * V3 config description: "ISO 8610 duration format. The duration determines how fast data is ready
 * for the monitor. For example, if your pipeline takes 2 days to deliver profiles to WhyLabs, the
 * value should beP2D."
 */
@AllArgsConstructor
public class DataReadinessDurationPredicate implements BiPredicate<Analyzer, Long> {

  private ZonedDateTime currentTime;

  /**
   * This is a gate, returns true if the calculation may proceed. False if the target batch is too
   * recent (thus not ready to run)
   */
  public boolean test(Analyzer analyzer, Long targetBatchTimestamp) {
    if (currentTime == null) {
      // not a real scenario, just makes unit testing easier
      return true;
    }
    /**
     * This is a special case where the ingestion metric doesn't care about the data readiness
     * duration. However its too easy to copy/paste analyzer configs and carry that over and make
     * ingestion metric analyzers flaky.
     */
    if (analyzer.getMetric() != null
        && analyzer.getMetric().equals(AnalysisMetric.secondsSinceLastUpload.name())) {
      return true;
    }

    if (analyzer.getDataReadinessDuration() == null) {
      return true;
    } else {
      long cutoff =
          currentTime.minus(analyzer.getDataReadinessDuration()).toInstant().toEpochMilli();
      if (targetBatchTimestamp > cutoff) {
        return false;
      }
    }

    return true;
  }
}

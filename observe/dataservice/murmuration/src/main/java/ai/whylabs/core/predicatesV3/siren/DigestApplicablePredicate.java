package ai.whylabs.core.predicatesV3.siren;

import ai.whylabs.core.configV3.structure.DigestMode;
import ai.whylabs.core.configV3.structure.ImmediateSchedule;
import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.function.BiPredicate;
import lombok.AllArgsConstructor;
import lombok.val;

/**
 * Check if this analyzer result should be included in the digest based on constraints around the
 * digest mode configuration
 */
@AllArgsConstructor
public class DigestApplicablePredicate implements BiPredicate<Monitor, AnalyzerResult> {

  private ZonedDateTime currentTime;
  private String runId;

  @Override
  public boolean test(Monitor monitor, AnalyzerResult analyzerResult) {
    DigestMode digestMode = (DigestMode) monitor.getMode();

    // How far back the lookback period is for this digest
    if (digestMode.getDatasetTimestampOffset() != null) {
      val datasetTimestamp =
          ZonedDateTime.ofInstant(
              Instant.ofEpochMilli(analyzerResult.getDatasetTimestamp()), ZoneOffset.UTC);
      val anchor = currentTime.minus(digestMode.getDatasetTimestampOffsetParsed());
      if (datasetTimestamp.isBefore(anchor)) {
        return false;
      }
    }

    // Don't send anything created more recent than a duration
    if (digestMode.getCreationTimeOffset() != null) {
      val creationTimestamp =
          ZonedDateTime.ofInstant(
              Instant.ofEpochMilli(analyzerResult.getCreationTimestamp()), ZoneOffset.UTC);
      val anchor = currentTime.minus(digestMode.getCreationTimeOffsetParsed());
      if (creationTimestamp.isBefore(anchor)) {
        return false;
      }
    }

    if (monitor.getSchedule() != null
        && monitor.getSchedule().getClass().isAssignableFrom(ImmediateSchedule.class)) {
      // Immediate schedules ignore time range selection and scope down to the runId
      return analyzerResult.getRunId().equals(runId);
    }

    return true;
  }
}

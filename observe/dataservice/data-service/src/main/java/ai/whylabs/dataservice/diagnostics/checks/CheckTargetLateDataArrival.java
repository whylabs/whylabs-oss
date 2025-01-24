package ai.whylabs.dataservice.diagnostics.checks;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.dataservice.diagnostics.DiagnosticContext;
import ai.whylabs.dataservice.diagnostics.enums.GeneralObservation;
import ai.whylabs.dataservice.diagnostics.output.DiagnosticOutput;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;

public class CheckTargetLateDataArrival implements Check {

  @Override
  public void check(DiagnosticContext c, List<DiagnosticOutput> out) {
    if (c.getMostRecentTimestampUploadedForTarget() == null) {
      // Ideally PG would never be missing a target that's been analyzed, but I just love null
      // checks
      return;
    }

    long cutoff =
        ComputeJobGranularities.truncateTimestamp(
            c.getAnalysis().getCreationTimestamp(), Granularity.hourly);
    // I'm thinking we truncate to the hour that the pipeline runs, is that %100 right? Need to
    // simmer on that
    if (c.getMostRecentTimestampUploadedForTarget() > cutoff) {

      out.add(
          new DiagnosticOutput(
              GeneralObservation.TARGET_LATE_DATA,
              "Analysis ran based on data uploaded by "
                  + ZonedDateTime.ofInstant(Instant.ofEpochMilli(cutoff), ZoneOffset.UTC)
                  + " but more data "
                  + "arrived for the target as recent as "
                  + ZonedDateTime.ofInstant(
                      Instant.ofEpochMilli(c.getMostRecentTimestampUploadedForTarget()),
                      ZoneOffset.UTC)
                  + ". Analysis is immutable until it has been first removed by the deletion API. It's advisable to use batchCoolDownPeriod or dataReadinessDuration settings to delay analysis until all data has been profiled.",
              SuccessEnum.FAIL));
    } else {
      out.add(
          new DiagnosticOutput(
              GeneralObservation.TARGET_LATE_DATA,
              "All target data uploaded prior to analysis",
              SuccessEnum.PASS));
    }
  }
}

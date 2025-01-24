package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.enums.Granularity;

public class BackfillGracePeriodCalculator {

  /**
   * The spec https://gitlab.com/whylabs/core/monitor-schema/-/blob/main/schema/schema.yaml#L27
   * actually specifies backfill late window options
   */
  public static int getDays(Granularity granularity) {
    switch (granularity) {
      case hourly:
      case daily:
      case PT15M:
        return 30;
      case weekly:
      case monthly:
        return 190;
      default:
        throw new IllegalArgumentException("Unimplemented granularity" + granularity);
    }
  }
}

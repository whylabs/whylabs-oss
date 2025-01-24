package ai.whylabs.core.granularity;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.enums.ExtendedChronoUnit;
import org.apache.commons.lang.NotImplementedException;

public class GranularityChronoUnitConverter {

  /**
   * This used to mirror values from ChronoUnit.java, but as we added new options that didn't align
   * 1:1 with time we had to move away from using ChronoUnit's enum. That said we had a bunch of
   * data in the datalake we want to keep consistent with itself.
   */
  public static ExtendedChronoUnit getDatasetGranularity(Granularity granularity) {
    switch (granularity) {
      case PT15M:
        return ExtendedChronoUnit.PT15M;
      case daily:
        return ExtendedChronoUnit.DAYS;
      case hourly:
        return ExtendedChronoUnit.HOURS;
      case monthly:
        return ExtendedChronoUnit.MONTHS;
      case weekly:
        return ExtendedChronoUnit.WEEKS;
      default:
        throw new NotImplementedException("Unsupported granularity " + granularity);
    }
  }

  public static Granularity getGranularity(ExtendedChronoUnit granularity) {
    switch (granularity) {
      case PT15M:
        return Granularity.PT15M;
      case DAYS:
        return Granularity.daily;
      case HOURS:
        return Granularity.hourly;
      case MONTHS:
        return Granularity.monthly;
      case WEEKS:
        return Granularity.weekly;
      default:
        throw new NotImplementedException("Unsupported granularity " + granularity);
    }
  }
}

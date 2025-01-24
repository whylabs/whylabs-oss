package ai.whylabs.core.predicatesV3.inclusion;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.FixedCadenceSchedule;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.core.utils.TriPredicate;
import java.time.ZonedDateTime;
import java.util.Map;
import lombok.val;

/**
 * The second since last upload metric has weird scheduling as the dataset timestamp aligns with the
 * job runtime rather than the model granularity. We want to avoid running the analysis every hour
 * if one has been ran within the scheduled cadence. We potentially consider doing this logic when
 * evaluating the analyzer's schedule, but for now this'll make things smoother for D&B.
 */
public class SecondsSinceLastUploadPredicate
    implements TriPredicate<Analyzer, ZonedDateTime, Map<Long, Map<String, AnalyzerResult>>> {
  public static final long hour = 3600000l;
  public static final long day = 86400000l;
  public static final long week = 604800000l;
  public static final long month = 2592000000l;

  @Override
  public boolean test(
      Analyzer analyzer,
      ZonedDateTime currentTime,
      Map<Long, Map<String, AnalyzerResult>> feedbackLoop) {
    // Very narrow targeting for this predicate as this one metric has a wonky flow
    if (analyzer.getConfig().getMetric() == null
        || !analyzer.getConfig().getMetric().equals(AnalysisMetric.secondsSinceLastUpload.name())
        || analyzer.getSchedule() == null
        || !analyzer.getSchedule().getClass().isAssignableFrom(FixedCadenceSchedule.class)) {
      return true;
    }
    long newest = 0l;
    for (val f : feedbackLoop.entrySet()) {
      if (f.getValue().containsKey(analyzer.getId())) {
        newest = Math.max(f.getKey(), newest);
      }
    }

    FixedCadenceSchedule schedule = (FixedCadenceSchedule) analyzer.getSchedule();
    long currentTimeMillis = currentTime.toInstant().toEpochMilli();
    switch (schedule.getCadence()) {
      case hourly:
        return currentTimeMillis - newest > hour;
      case daily:
        return currentTimeMillis - newest > day;
      case weekly:
        return currentTimeMillis - newest > week;
      case monthly:
        // TODO: Revise based on user feedback
        return currentTimeMillis - newest > month;
      case individual:
        return false;
      default:
        return true;
    }
  }
}

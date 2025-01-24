package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.granularity.ComputeJobGranularities;
import com.cronutils.model.Cron;
import com.cronutils.model.CronType;
import com.cronutils.model.definition.CronDefinition;
import com.cronutils.model.definition.CronDefinitionBuilder;
import com.cronutils.model.time.ExecutionTime;
import com.cronutils.parser.CronParser;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Slf4j
public class CronSchedule implements AnalyzerSchedule, MonitorSchedule {
  private static final Cache<String, Boolean> CACHE;

  static {
    CACHE = CacheBuilder.newBuilder().maximumSize(100000).build();
  }

  private String cron;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private List<TimeRange> exclusionRanges = Collections.emptyList(); // optional

  /**
   * Provide feedback if a given date matches the cron expression.
   *
   * <p>Params: date – - ZonedDateTime instance. If null, a NullPointerException will be raised.
   *
   * <p>Returns: true if date matches cron expression requirements, false otherwise
   */
  public boolean isMatch(ZonedDateTime time) {
    if (StringUtils.isEmpty(cron)) {
      // If not specified then assume disabled
      return false;
    }

    if (exclusionRanges.parallelStream().anyMatch(r -> r.contains(time))) return false;

    String cacheKey = new StringBuilder().append(cron).append(time.toString()).toString();
    try {
      return CACHE.get(
          cacheKey,
          new Callable<Boolean>() {
            @Override
            public Boolean call() throws Exception {
              Cron quartzCron = parse(cron);
              return ExecutionTime.forCron(quartzCron).isMatch(time);
            }
          });
    } catch (ExecutionException e) {
      log.error("Error evaluating cron expression " + cron, e);
      return false;
    }
  }

  private static Cron parse(String cron) {
    CronType dialect = CronType.UNIX;
    if (cron.split(" ").length == 6) {
      dialect = CronType.SPRING;
    }

    CronDefinition cronDefinition = CronDefinitionBuilder.instanceDefinitionFor(dialect);
    CronParser parser = new CronParser(cronDefinition);
    return parser.parse(cron);
  }

  @Override
  public ZonedDateTime getInitialTargetBucket(ZonedDateTime from, Granularity granularity) {

    if (StringUtils.isEmpty(cron)) {
      // If not specified then assume disabled
      return null;
    }
    val e = ExecutionTime.forCron(parse(cron));
    val n = e.nextExecution(from);
    if (n.isPresent()) {
      return n.get();
    }
    return null;
  }

  @Override
  public ZonedDateTime getNextTargetBucket(ZonedDateTime previousTargetBucket) {
    if (StringUtils.isEmpty(cron)) {
      // If not specified then assume disabled
      return null;
    }

    val l = ExecutionTime.forCron(parse(cron)).nextExecution(previousTargetBucket);
    if (l.isPresent()) {
      return l.get();
    }
    return null;
  }

  @Override
  public ZonedDateTime getNextFire(
      ZonedDateTime targetBucket, Duration dataReadinessDuration, Granularity datasetGranularity) {
    /**
     * Ok, you have a cron schedule to analyze every Tuesday's bucket. Tuesday has to have ended for
     * it to be eligable to analyze so really its wed at midnight on a daily dataset it can run.
     */
    val t = ComputeJobGranularities.add(targetBucket, datasetGranularity, 1);
    if (dataReadinessDuration != null) {
      return t.plus(dataReadinessDuration);
    }

    return t;
  }
}

package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.time.Duration;
import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = FixedCadenceSchedule.class, name = "fixed"),
  @JsonSubTypes.Type(value = CronSchedule.class, name = "cron")
})
public interface AnalyzerSchedule extends Schedule {
  ZonedDateTime getInitialTargetBucket(ZonedDateTime from, Granularity granularity);

  ZonedDateTime getNextTargetBucket(ZonedDateTime previousTargetBucket);

  ZonedDateTime getNextFire(
      ZonedDateTime targetBucket, Duration dataReadinessDuration, Granularity datasetGranularity);
}

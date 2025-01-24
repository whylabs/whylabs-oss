package ai.whylabs.core.configV3.structure;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = FixedCadenceSchedule.class, name = "fixed"),
  @JsonSubTypes.Type(value = CronSchedule.class, name = "cron"),
  @JsonSubTypes.Type(value = ImmediateSchedule.class, name = "immediate")
})
public interface MonitorSchedule extends Schedule {}

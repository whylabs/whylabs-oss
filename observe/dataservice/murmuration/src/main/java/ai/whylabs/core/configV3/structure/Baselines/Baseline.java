package ai.whylabs.core.configV3.structure.Baselines;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = ReferenceProfileId.class, name = "Reference"),
  @JsonSubTypes.Type(value = TrailingWindowBaseline.class, name = "TrailingWindow"),
  @JsonSubTypes.Type(value = TimeRangeBaseline.class, name = "TimeRange"),
  @JsonSubTypes.Type(value = SingleBatchBaseline.class, name = "CurrentBatch"),
})
public interface Baseline {
  public Integer getExpectedBaselineDatapoints(Granularity entityGranularity);
}

package ai.whylabs.core.configV3.structure;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = EveryAnamolyMode.class, name = "EVERY_ANOMALY"),
  @JsonSubTypes.Type(value = DigestMode.class, name = "DIGEST"),
})
public interface MonitorMode {
  public AnomalyFilter getAnomalyFilter();
}

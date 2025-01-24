package ai.whylabs.core.configV3.structure.actions;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = GlobalAction.class, name = "global"),
  @JsonSubTypes.Type(value = EmailAction.class, name = "email"),
  @JsonSubTypes.Type(value = SlackAction.class, name = "slack"),
  @JsonSubTypes.Type(value = RawWebhook.class, name = "raw")
})
public interface Action {}

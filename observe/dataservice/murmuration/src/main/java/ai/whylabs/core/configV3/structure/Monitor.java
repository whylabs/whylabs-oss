package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.actions.Action;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties
@FieldNameConstants
public class Monitor {
  private Metadata metadata;
  private String id; // A human-readable alias for a monitor.
  private String displayName; // display name for the monitor if view through WhyLabs UI

  @JsonFormat(with = JsonFormat.Feature.ACCEPT_SINGLE_VALUE_AS_ARRAY)
  private List<String> analyzerIds;

  private MonitorSchedule schedule;

  // TODO: Implement
  private Boolean disabled;
  // TODO: Implement
  private Integer severity;

  private MonitorMode mode;
  private List<Action> actions;
}

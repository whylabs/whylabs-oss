package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
  @JsonSubTypes.Type(value = ColumnMatrix.class, name = "column"),
  @JsonSubTypes.Type(value = DatasetMatrix.class, name = "dataset"),
})
public interface TargetMatrix {
  TargetLevel getLevel();

  @JsonIgnore
  List<String> getAllowedColumns();

  @JsonIgnore
  List<String> getBlockedColumns();

  List<Segment> getSegments();

  List<Segment> getExcludeSegments();

  String getProfileId();
}

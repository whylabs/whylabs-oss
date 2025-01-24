package ai.whylabs.core.structures.monitor.events.calculationOutput;

import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;
import javax.persistence.Column;
import javax.persistence.Embeddable;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import lombok.Data;
import org.hibernate.annotations.Type;

@Embeddable
@Data
public class ColumnListChangeContainer {
  @JsonPropertyDescription("How many schema columns were added")
  private Long columnList_added;

  @JsonPropertyDescription("How many schema columns were removed")
  private Long columnList_removed;

  @JsonPropertyDescription("A small sample of added columns")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> columnList_addedSample;

  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  @JsonPropertyDescription("A small sample of removed columns")
  private List<String> columnList_removedSample;

  @JsonPropertyDescription("Alert based on adding new columns, removing columns, or both")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "column_list_mode")
  @Type(type = "column_list_mode_enum")
  private ColumnListChangeMode columnList_mode;
}

package ai.whylabs.core.structures.monitor.events.calculationOutput;

import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonOperator;
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
public class FrequentStringComparisonContainer {
  @JsonPropertyDescription("Type of frequent string item comparison")
  @Enumerated(EnumType.STRING)
  @Type(type = "frequent_string_comparison_operator_enum")
  @Column(columnDefinition = "frequent_String_comparison_operator")
  private FrequentStringComparisonOperator frequentStringComparison_operator;

  @JsonPropertyDescription("A small sample on the difference of items")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  @Column(columnDefinition = "frequent_string_comparison_sample")
  private List<String> frequentStringComparison_sample;

  @JsonPropertyDescription("estimated counts for each of the samples")
  @Column(name = "frequent_string_sample_count", columnDefinition = "jsonb")
  @Type(type = "com.vladmihalcea.hibernate.type.json.JsonType")
  private Long[][] freqStringCount;
}

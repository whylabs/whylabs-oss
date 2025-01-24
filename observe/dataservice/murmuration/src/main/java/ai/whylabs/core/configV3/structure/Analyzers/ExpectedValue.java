package ai.whylabs.core.configV3.structure.Analyzers;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpectedValue {

  @JsonProperty("str")
  @JsonInclude(Include.NON_NULL)
  private String stringValue;

  @JsonProperty("int")
  @JsonInclude(Include.NON_NULL)
  private Integer intValue;

  @JsonInclude(Include.NON_NULL)
  @JsonProperty("float")
  private Double floatValue;

  /**
   * Valid instances of this class have one or none of the fields set (non-null). Any other
   * combination is inconsistent.
   *
   * @return true if instance is in a consistent state.
   */
  @JsonIgnore
  public boolean isValid() {
    return (stringValue == null && intValue == null && floatValue == null)
        || (intValue == null && floatValue == null)
        || (stringValue == null && intValue == null)
        || (stringValue == null && floatValue == null);
  }

  /**
   * @return true if any of the expected value fields are set
   */
  @JsonIgnore
  public boolean isSet() {
    return (stringValue != null || intValue != null || floatValue != null);
  }
}

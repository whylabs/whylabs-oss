package ai.whylabs.py;

import java.io.Serializable;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@NoArgsConstructor // required a no argument constructor for Jackson
@Data
@ToString
public class ChartOutput implements Serializable {
  private Boolean success = Boolean.FALSE;
  private String message;
}

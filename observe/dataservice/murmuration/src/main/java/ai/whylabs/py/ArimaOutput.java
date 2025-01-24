package ai.whylabs.py;

import java.io.Serializable;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor // required a no argument constructor for Jackson
@Data
public class ArimaOutput implements Serializable {

  private Double value;
  private Double upper;
  private Double lower;
  private Double replacement;
  private Long alertCount;
  private boolean shouldReplace;
  private Double adjustedPrediction;
  private Double lambdaKeep;
}

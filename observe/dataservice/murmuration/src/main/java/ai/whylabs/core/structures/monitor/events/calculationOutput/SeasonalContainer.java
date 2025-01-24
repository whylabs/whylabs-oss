package ai.whylabs.core.structures.monitor.events.calculationOutput;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import javax.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public class SeasonalContainer {

  @JsonPropertyDescription("Seasonal algorithm: should this value be replaced or not")
  private Boolean seasonal_shouldReplace;

  @JsonPropertyDescription(
      "Seasonal lambda keep: This parameter controls a weighted average between"
          + " the customer supplied value and the adjusted prediction after we've decided to adjust the"
          + " prediction. In the extremes, lambda_keep=1.0 means always use the customer data and "
          + "lambda_keep=0.0 means always use the adjusted prediction")
  private Double seasonal_lambdaKeep;

  @JsonPropertyDescription(
      "Seasonal adjusted value: we add some randomness in a Gaussian distribution"
          + "and then multiply it by the stddev to calculate this value (we don't want to use the"
          + "prediction directly since ARIMA will collapse on the confidence interval)")
  private Double seasonal_adjusted_prediction;

  @JsonPropertyDescription(
      "ARIMA replacement value after applying the above lambda keep and adjusted" + "predictions")
  private Double seasonal_replacement;
}

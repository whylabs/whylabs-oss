package ai.whylabs.py;

import ai.whylabs.core.calculationsV3.results.CalculationResult;
import java.util.List;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;
import org.apache.commons.lang3.tuple.Pair;

/**
 * From
 * http://alkaline-ml.com/pmdarima/modules/generated/pmdarima.arima.ARIMA.html#pmdarima.arima.ARIMA
 */
@Builder(toBuilder = true)
@Value
public class PyArimaInput {
  long[] timestamps;
  Double[] values;
  Double actual;

  @Singular List<Pair<Long, CalculationResult>> priors;

  @Builder.Default double alpha = 0.05;

  @Builder.Default double stddevFactor = 1.0;

  @Builder.Default int stddevMaxBatchSize = 30;

  // order
  int p;
  int d;
  int q;

  // seasonal order
  int seasonal_P;
  int seasonal_D;
  int seasonal_Q;
  int m;

  @Singular List<String> eventPeriods;
}

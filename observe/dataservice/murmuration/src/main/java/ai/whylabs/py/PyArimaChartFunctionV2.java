package ai.whylabs.py;

import com.whylabs.starling.functions.FastApiFunction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PyArimaChartFunctionV2 extends FastApiFunction<PyChartInput, ChartOutput> {

  public static PyArimaChartFunctionV2 INSTANCE = new PyArimaChartFunctionV2();

  private PyArimaChartFunctionV2() {
    super("charts/arima", ChartOutput.class);
  }

  @Override
  public ChartOutput apply(PyChartInput input) {
    try {
      return super.apply(input);
    } catch (Exception e) {
      log.error("Failed to render chart. Input: {}\n{}", input, e);
      return null;
    }
  }
}

package ai.whylabs.py;

import com.whylabs.starling.functions.FastApiException;
import com.whylabs.starling.functions.FastApiFunction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PyStddevChartFunctionV2 extends FastApiFunction<PyChartInput, ChartOutput> {
  public static PyStddevChartFunctionV2 INSTANCE = new PyStddevChartFunctionV2();

  private PyStddevChartFunctionV2() {
    super("charts/stddev", ChartOutput.class);
  }

  @Override
  public ChartOutput apply(PyChartInput input) {
    try {
      return super.apply(input);
    } catch (FastApiException e) {
      log.error("Failed to render chart. Input: {}", input, e);
      return null;
    }
  }
}

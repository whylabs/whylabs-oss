package ai.whylabs.py;

import com.whylabs.starling.functions.FastApiException;
import com.whylabs.starling.functions.FastApiFunction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class PyDriftChartFunctionV2 extends FastApiFunction<PyChartInput, ChartOutput> {
  public static PyDriftChartFunctionV2 INSTANCE = new PyDriftChartFunctionV2();

  private PyDriftChartFunctionV2() {
    super("charts/drift", ChartOutput.class);
  }

  @Override
  public ChartOutput apply(PyChartInput input) {
    try {
      return super.apply(input);
    } catch (FastApiException e) {
      log.error("Failed to render drift chart. Input: {}", input, e);
      return null;
    }
  }
}

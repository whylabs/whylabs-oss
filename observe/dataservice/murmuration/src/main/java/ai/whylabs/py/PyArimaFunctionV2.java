package ai.whylabs.py;

import com.whylabs.starling.functions.FastApiFunction;

public class PyArimaFunctionV2 extends FastApiFunction<PyArimaInput, ArimaOutput> {
  public static PyArimaFunctionV2 INSTANCE = new PyArimaFunctionV2();

  private PyArimaFunctionV2() {
    super("compute/arima", ArimaOutput.class);
  }
}

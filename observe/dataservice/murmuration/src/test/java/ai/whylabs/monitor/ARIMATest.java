package ai.whylabs.monitor;

import com.workday.insights.timeseries.arima.Arima;
import com.workday.insights.timeseries.arima.struct.ArimaParams;
import com.workday.insights.timeseries.arima.struct.ForecastResult;
import lombok.val;
import org.apache.commons.lang3.ArrayUtils;
import org.testng.annotations.Test;

public class ARIMATest {
  @Test
  public void testJob() {
    final double[] dataArray =
        new double[] {
          53995, 63584, 46880, 69363, 89297, 61731, 54018, 43566, 44322, 52810, 71249, 95406, 72484,
          59732, 56022, 45326, 45736, 55468, 83074, 61116, 52807, 47343, 44966, 44276, 56520, 75372,
          55512, 46165, 45894, 44751, 62758, 62201, 78172, 62170, 45568, 35053, 38540, 37264, 44684,
          56860, 44452, 38576, 38760, 38722, 38597, 42353, 59305, 47440, 38184, 37636, 37972, 35153,
          39832, 52527, 38809, 34744, 33816, 33682, 33385, 39658, 51634, 40918, 35920, 35765, 34318,
          34824, 40992, 51372, 41640, 36735, 35004, 34367, 33926, 40472, 53882, 44264, 39564, 37586,
          35038, 33791, 39434, 50481, 40282, 36804, 35540, 35411, 33550, 37717, 51500, 40917, 36837,
          36798, 34663, 42466, 29420, 52164, 45651, 36562, 33817, 31375, 32324, 35550, 45623, 37951,
          34028, 33327, 33018, 32318, 32413, 49829, 41457, 33840, 32822, 33186, 31282, 35296, 44877,
          36368, 29221, 27845, 27033, 26137, 30344, 40589, 29172, 19918, 19697
        };
    val l = dataArray.length;

    int forecastSize = 1;

    // Set ARIMA model parameters.
    //  Params:
    //  p – ARIMA parameter, the order (number of time lags) of the autoregressive model
    //  d – ARIMA parameter, the degree of differencing
    //  q – ARIMA parameter, the order of the moving-average model
    //  P – ARIMA parameter, autoregressive term for the seasonal part
    //  D – ARIMA parameter, differencing term for the seasonal part
    //  Q – ARIMA parameter, moving average term for the seasonal part
    //  m – ARIMA parameter, the number of periods in each season
    val interval = 55;
    for (int start = interval; start < l - (interval + 1); start++) {
      // ARIMA(1,0,0)(2,1,0)[7]  # from auto.arima in R

      // Obtain forecast result. The structure contains forecasted values and performance metric
      // etc.
      double[] data = ArrayUtils.subarray(dataArray, start, start + interval);
      double target = dataArray[start + interval + 1];
      ArimaParams params = new ArimaParams(1, 0, 0, 2, 1, 0, 7);

      ForecastResult forecastResult = Arima.forecast_arima(data, forecastSize, params);

      // Read forecast values
      double[] forecastData = forecastResult.getForecast(); // in this example, it will return { 2 }

      // You can obtain upper- and lower-bounds of confidence intervals on forecast values.
      // By default, it computes at 95%-confidence level. This value can be adjusted in
      // ForecastUtil.java
      double upper = forecastResult.getForecastUpperConf()[0];
      double lower = forecastResult.getForecastLowerConf()[0];
      if (target < lower || target > upper) {
        System.out.format("error expected=[%f, %f]. actual=%f\n", lower, upper, target);
      } else {
        System.out.format("OK expected=[%f, %f]. actual=%f\n", lower, upper, target);
      }
    }
  }
}

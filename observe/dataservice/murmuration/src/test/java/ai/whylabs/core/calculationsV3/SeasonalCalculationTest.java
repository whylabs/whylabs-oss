package ai.whylabs.core.calculationsV3;

import static org.testng.Assert.*;

import ai.whylabs.core.aggregation.ChartMetadata;
import ai.whylabs.core.calculationsV3.results.CalculationResult;
import ai.whylabs.core.calculationsV3.results.SeasonalResult;
import ai.whylabs.core.configV3.structure.Analyzers.SeasonalConfig;
import ai.whylabs.py.PythonFunctionTest;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.io.FileUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class SeasonalCalculationTest extends PythonFunctionTest {
  static final double[] values = {
    89119.0, 117282.0, 78701.0, 63456.0, 63731.0, 78161.0, 78581.0, 97605.0, 122480.0, 73446.0,
    50475.0, 54593.0, 58734.0, 69682.0, 90665.0, 118782.0, 81981.0, 67113.0, 68746.0, 71977.0,
    71574.0, 89365.0, 117979.0, 82202.0, 74041.0, 65384.0, 68420.0, 72037.0, 95780.0, 124183.0,
    88660.0, 69274.0, 72075.0, 71226.0, 74503.0, 90171.0, 121099.0, 78449.0, 65085.0, 67867.0,
    70683.0, 74116.0, 88331.0, 116593.0, 67528.0, 64423.0, 69250.0, 72336.0, 77564.0, 98849.0,
    134387.0, 88935.0, 65379.0, 67072.0, 76416.0, 99671.0, 102353.0, 139346.0, 95728.0, 71177.0,
    74040.0, 75962.0, 82451.0, 102919.0, 138432.0, 97540.0, 87728.0, 93528.0, 103738.0, 103738.0,
    189077.0, 147905.0, 102253.0, 92653.0, 92583.0, 90685.0, 93682.0, 115814.0, 155818.0, 111839.0,
    92157.0, 108890.0, 115669.0, 119441.0, 150351.0, 194144.0, 148981.0, 128873.0, 129462.0,
    141637.0
  };

  static final long[] timestamps = {
    1631836800000L, 1631923200000L, 1632009600000L, 1632096000000L, 1632182400000L,
    1632268800000L, 1632355200000L, 1632441600000L, 1632528000000L, 1632614400000L,
    1632700800000L, 1632787200000L, 1632873600000L, 1632960000000L, 1633046400000L,
    1633132800000L, 1633219200000L, 1633305600000L, 1633392000000L, 1633478400000L,
    1633564800000L, 1633651200000L, 1633737600000L, 1633824000000L, 1633910400000L,
    1633996800000L, 1634083200000L, 1634169600000L, 1634256000000L, 1634342400000L,
    1634428800000L, 1634515200000L, 1634601600000L, 1634688000000L, 1634774400000L,
    1634860800000L, 1634947200000L, 1635033600000L, 1635120000000L, 1635206400000L,
    1635292800000L, 1635379200000L, 1635465600000L, 1635552000000L, 1635638400000L,
    1635724800000L, 1635811200000L, 1635897600000L, 1635984000000L, 1636070400000L,
    1636156800000L, 1636243200000L, 1636329600000L, 1636416000000L, 1636502400000L,
    1636588800000L, 1636675200000L, 1636761600000L, 1636848000000L, 1636934400000L,
    1637020800000L, 1637107200000L, 1637193600000L, 1637280000000L, 1637366400000L,
    1637452800000L, 1637539200000L, 1637625600000L, 1637712000000L, 1637798400000L,
    1637884800000L, 1637971200000L, 1638057600000L, 1638144000000L, 1638230400000L,
    1638316800000L, 1638403200000L, 1638489600000L, 1638576000000L, 1638662400000L,
    1638748800000L, 1638835200000L, 1638921600000L, 1639008000000L, 1639094400000L,
    1639180800000L, 1639267200000L, 1639353600000L, 1639440000000L, 1639526400000L
  };

  public List<Pair<Long, CalculationResult>> generatePriorResults(SeasonalCalculation calc) {
    // create our initial baseline, 30 days of data...
    List<Pair<Long, Double>> baseline =
        IntStream.range(0, 30)
            .mapToObj(i -> Pair.of(timestamps[i], values[i]))
            .collect(Collectors.toList());

    // for each remaining `value`, calculate seasonal forecast event, based on 30-day baseline and
    // 1-day target.
    //
    // after each forecast, remove first day of baseline and add new baseline value to end so we
    // always have 30-days of baseline.
    val priors = new LinkedList<Pair<Long, CalculationResult>>();
    for (int n = 31; n < values.length; n++) {
      List<Pair<Long, Double>> target =
          IntStream.of(n)
              .mapToObj(i -> Pair.of(timestamps[i], values[i]))
              .collect(Collectors.toList());
      val result = calc.calculate(baseline, target, priors);
      priors.add(Pair.of(timestamps[n], result));
      baseline.remove(0);
      baseline.add(Pair.of(timestamps[n], values[n]));
    }
    return priors;
  }

  @SneakyThrows
  @Test()
  public void testRenderAnomalyChart() {
    // This test will be SKIPPED if PYSPARK_PYTHON is not set in ENV
    SeasonalConfig config =
        SeasonalConfig.builder()
            .params(Collections.singletonMap("enableAnomalyCharts", "true"))
            .build();
    val chartDir = Files.createTempDirectory("charts");
    try {
      val chartPath = chartDir.resolve("chart.png");
      val calc = new SeasonalCalculation(null, null, true, config);
      val prior = generatePriorResults(calc);

      ChartMetadata metadata = ChartMetadata.builder().columnName("FeatureName").build();

      // Iterate events in reverse order, looking for last anomaly.  Generate chart for events
      // leading up to anomaly.
      for (int i = prior.size() - 1; i >= 0; i--) {
        SeasonalResult priorResult = (SeasonalResult) prior.get(i).getValue();
        if (priorResult != null
            && priorResult.getAlertCount() != null
            && priorResult.getAlertCount() != 0) {
          calc.renderAnomalyChart(metadata, prior.subList(0, i + 1), chartPath.toString());
          break;
        }
      }
      // "enableAnomalyCharts" is  set in SeasonalConfig; expect chart to be created.
      assertTrue(Files.exists(chartPath, LinkOption.NOFOLLOW_LINKS));
    } finally {
      FileUtils.deleteDirectory(chartDir.toFile());
    }
  }

  @SneakyThrows
  @Test()
  public void testNotRenderAnomalyChart() {
    // This test will be SKIPPED if PYSPARK_PYTHON is not set in ENV
    SeasonalConfig config = SeasonalConfig.builder().build();
    val chartDir = Files.createTempDirectory("charts");
    try {
      val chartPath = chartDir.resolve("chart.png");
      val calc = new SeasonalCalculation(null, null, true, config);
      val prior = generatePriorResults(calc);

      ChartMetadata metadata = ChartMetadata.builder().columnName("teatFeature").build();

      // Find last anamolous event in list.  Generate chart for events leading up to anamoly.
      for (int i = prior.size() - 1; i >= 0; i--) {
        if (((SeasonalResult) prior.get(i).getValue()).getAlertCount() != 0) {
          calc.renderAnomalyChart(metadata, prior.subList(0, i + 1), chartPath.toString());
          break;
        }
      }
      // assert that the chart was NOT created because "enableAnomalyCharts" is not set in
      // SeasonalConfig.
      assertFalse(Files.exists(chartPath, LinkOption.NOFOLLOW_LINKS));
    } finally {
      FileUtils.deleteDirectory(chartDir.toFile());
    }
  }

  // expect exception when passing totslly empty baseline, when minBatchSize=7
  @Test(
      expectedExceptions = {java.lang.RuntimeException.class},
      expectedExceptionsMessageRegExp = ".*Calculation requires at least.*")
  public void testEmptyBaseline() {
    // This test will be SKIPPED if PYSPARK_PYTHON is not set in ENV
    SeasonalConfig config = SeasonalConfig.builder().minBatchSize(7).build();
    val calc = new SeasonalCalculation(null, null, true, config);
    // create empty baseline, 90 days of null...
    List<Pair<Long, Double>> baseline =
        IntStream.range(0, 90)
            .mapToObj(i -> Pair.of(timestamps[i], (Double) null))
            .collect(Collectors.toList());
    calc.calculate(baseline, null, Collections.emptyList());
  }

  // expect exception when passing partial baseline, less than minBatchSize=7
  @Test(
      expectedExceptions = {java.lang.RuntimeException.class},
      expectedExceptionsMessageRegExp = ".*Calculation requires at least.*")
  public void testShortBaseline() {
    // This test will be SKIPPED if PYSPARK_PYTHON is not set in ENV
    SeasonalConfig config = SeasonalConfig.builder().minBatchSize(7).build();
    val calc = new SeasonalCalculation(null, null, true, config);
    // create empty baseline, 90 days of null...
    List<Pair<Long, Double>> baseline =
        IntStream.range(0, 84)
            .mapToObj(i -> Pair.of(timestamps[i], (Double) null))
            .collect(Collectors.toList());
    baseline.addAll(
        IntStream.range(84, 90)
            .mapToObj(i -> Pair.of(timestamps[i], values[i]))
            .collect(Collectors.toList()));
    calc.calculate(baseline, null, Collections.emptyList());
    // expect exception because our minBatchSize=7 and we passed in only 6 values in the baseline.
  }

  // expect success when passing a full 90-day baseline
  @Test()
  public void testFullBaseline() {
    // This test will be SKIPPED if PYSPARK_PYTHON is not set in ENV
    SeasonalConfig config = SeasonalConfig.builder().minBatchSize(7).build();
    val calc = new SeasonalCalculation(null, null, true, config);

    // create full baseline, 90 days of data...
    List<Pair<Long, Double>> baseline =
        IntStream.range(0, 90)
            .mapToObj(i -> Pair.of(timestamps[i], values[i]))
            .collect(Collectors.toList());

    List<Pair<Long, Double>> target =
        IntStream.of(1)
            .mapToObj(i -> Pair.of(timestamps[i], values[i]))
            .collect(Collectors.toList());

    val res = calc.calculate(baseline, target, generatePriorResults(calc));

    // expect successful non-null result because our minBatchSize was only 7
    assertNotNull(res);
  }
}

package ai.whylabs.core.configV3.structure.Analyzers;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.instanceOf;
import static org.testng.Assert.assertNotNull;
import static org.testng.Assert.assertNull;

import ai.whylabs.core.calculationsV3.EqualityCalculationDouble;
import ai.whylabs.core.calculationsV3.EqualityCalculationLong;
import ai.whylabs.core.calculationsV3.EqualityCalculationString;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import lombok.val;
import org.testng.annotations.Test;

public class ComparisonConfigTest {

  /**
   * "comparison" analyzer config can potentially be used with 3 types of metric; longs, double, and
   * string. Each requires a different calculation function to maintain type compatibility. The type
   * of each metric is specified by the `getExtractorOutputType(AnalysisMetric m)` function.
   *
   * <p>The next few tests assert that specific metrics generate the expected type of comparison
   * calculation.
   */
  @Test()
  public void testHappyPathDoubleComparedToFloat() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"float\": 9.0 }, \"metric\": \"count\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationDouble.class));
    }
  }

  @Test()
  public void testHappyPathDoubleComparedToInt() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"int\": 9 }, \"metric\": \"count\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationDouble.class));
    }
  }

  @Test()
  public void testHappyPathDoubleComparedToStr() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"str\": \"9\" }, \"metric\": \"count\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationDouble.class));
    }
  }

  @Test()
  public void testHappyPathLong() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"int\": 9 }, \"metric\": \"unique_lower\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationLong.class));
    }
  }

  @Test()
  public void testHappyPathString() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"str\": \"9\" }, \"metric\": \"inferred_data_type\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationString.class));
    }
  }

  @Test()
  public void testNaN() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"str\": \"NaN\" }, \"metric\": \"count\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      assertNotNull(calculation);
      assertThat(calculation, instanceOf(EqualityCalculationDouble.class));
    }
  }

  /**
   * Assert that "comparison" config will not produce a calculation if the specified metric does not
   * have a type compatible with longs, double, or string
   */
  @Test()
  public void testBadMetricType() {
    val json =
        "{\n"
            + "  \"analyzers\": [\n"
            + "    {\n"
            + "      \"schedule\": { \"type\": \"fixed\", \"cadence\": \"daily\" },\n"
            + "      \"id\": \"is-equal-to-9-analyzer\",\n"
            + "      \"targetMatrix\": { \"type\": \"column\", \"include\": [\"customer_city\"], \"exclude\": [ ], \"segments\": [ ] },\n"
            + "      \"config\": { \"expected\": { \"int\": 9 }, \"metric\": \"histogram\", \"operator\": \"eq\", \"type\": \"comparison\" }\n"
            + "    }\n"
            + "  ]\n"
            + "}";

    val mv3Config = MonitorConfigV3JsonSerde.parseMonitorConfigV3(json);
    val factory = new CalculationFactory();
    assertThat(mv3Config.getAnalyzers(), hasSize(equalTo(1)));
    for (Analyzer analyzer : mv3Config.getAnalyzers()) {
      val calculation = factory.toCalculation(analyzer, mv3Config, true);
      // mismatched metric type - cannot apply comparison analyzer to histogram
      assertNull(calculation);
    }
  }
}

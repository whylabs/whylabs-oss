package ai.whylabs.dataservice.metrics.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.hamcrest.core.Every.everyItem;

import ai.whylabs.dataservice.metrics.query.FormulaQuery;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.val;
import org.junit.jupiter.api.Test;

public class FormulaEvaluationTest {
  FormulaQuery formulaQuery(String formula, String id, Boolean usePrefix) {
    val f = new FormulaQuery();
    f.setQueryId(id);
    f.setPrefixResults(usePrefix);
    f.setFormula(formula);
    return f;
  }

  TimeSeriesResult.MetricEntry metricEntry(Long timestamp, Long lastModified, Double value) {
    val m = new TimeSeriesResult.MetricEntry();
    m.setTimestamp(timestamp);
    m.setLastModified(lastModified);
    m.setValue(value);
    return m;
  }

  TimeSeriesResult mkResult(String id, List<Double> values) {
    TimeSeriesResult ts = new TimeSeriesResult();
    // our timeseries input consists of only two timepoints.
    ts.setData(
        Arrays.asList(
            metricEntry(1698796800000L, 1699295651125L, values.get(0)),
            metricEntry(1698883200000L, 1699295717368L, values.get(1))));
    ts.setId(id);
    ts.setHidden(true);
    return ts;
  }

  /**
   * test a configuration containing two ratio timeseries with a user-supplied formula, like this...
   * spotless:off
     * {
     *   "rollupGranularity": "daily",
     *   "interval": "2023-11-01T00:00:00.000Z/P5D",
     *   "timeseries": [
     *     {
     *       "queryId": "a",
     *       "metric": "null_ratio",
     *       "resourceId": "model-0",
     *       "columnName": "annual_inc",
     *       "segment": [ {"key": "purpose","value": "car"}
     *     },
     *     {
     *       "queryId": "b",
     *       "metric": "null_ratio",
     *       "resourceId": "model-0",
     *       "columnName": "annual_inc",
     *       "segment": [ {"key": "purpose","value": "credit_card"}
     *     }
     *   ],
     *    "formulas": [
     *     {
     *       "queryId": "formula1",
     *       "formula": "abs(a - b)"
     *     }
     *   ]
     * }
     * spotless:on
   */
  @Test
  void testFormulaOfRatios() {
    List<TimeSeriesResult> timeseries =
        Arrays.asList(
            mkResult("a_count_null", Arrays.asList(0.0D, 0.1D)),
            mkResult("a_count", Arrays.asList(200D, 300D)),
            mkResult("b_count_null", Arrays.asList(0.1D, 0.2D)),
            mkResult("b_count", Arrays.asList(200D, 300D)));

    // two ratio formulas should produce non-null results
    val ratioFormulas =
        Arrays.asList(
            formulaQuery("count_null / count", "a", true),
            formulaQuery("count_null / count", "b", true));

    FormulaEvaluation formulaEvaluation = new FormulaEvaluation(timeseries);
    List<TimeSeriesResult> results = formulaEvaluation.evaluate(ratioFormulas);
    assertThat(results, hasSize(equalTo(2)));
    List<Double> values =
        results.stream()
            .flatMap(ts -> ts.getData().stream())
            .map(me -> me.getValue())
            .collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));

    // add a third formula that references non-existant prerequisite "c"
    // expect null values for results from last formula
    val badFormulas =
        Arrays.asList(
            formulaQuery("count_null / count", "a", true),
            formulaQuery("count_null / count", "b", true),
            formulaQuery("abs(a - c)", "formula1", false));

    formulaEvaluation = new FormulaEvaluation(timeseries);
    results = formulaEvaluation.evaluate(badFormulas);
    assertThat(results, hasSize(equalTo(3)));
    // every result value from the last formula is null...
    assertThat(results.get(2).getId(), is("formula1"));
    values =
        results.get(2).getData().stream().map(me -> me.getValue()).collect(Collectors.toList());
    assertThat(values, everyItem(nullValue()));

    // add a correct third formula that references prerequisite "b"
    // expect non-null values for results from all formulas
    val goodFormulas =
        Arrays.asList(
            formulaQuery("count_null / count", "a", true),
            formulaQuery("count_null / count", "b", true),
            formulaQuery("abs(a - b)", "formula1", false));

    formulaEvaluation = new FormulaEvaluation(timeseries);
    results = formulaEvaluation.evaluate(goodFormulas);
    assertThat(results, hasSize(equalTo(3)));
    values =
        results.stream()
            .flatMap(ts -> ts.getData().stream())
            .map(me -> me.getValue())
            .collect(Collectors.toList());
    assertThat(values, everyItem(notNullValue()));
  }
}

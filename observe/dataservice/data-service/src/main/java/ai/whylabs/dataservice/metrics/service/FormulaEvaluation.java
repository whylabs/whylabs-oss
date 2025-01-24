package ai.whylabs.dataservice.metrics.service;

import ai.whylabs.core.parser.FormulaEvaluator;
import ai.whylabs.dataservice.metrics.query.FormulaQuery;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import com.google.common.collect.Maps;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.collections4.IterableUtils;

@Slf4j
public class FormulaEvaluation {
  private final List<TimeSeriesResult> timeseries;
  private final List<TimeSeriesResult> formulaResults;

  public FormulaEvaluation(List<TimeSeriesResult> timeseries) {
    this.timeseries = timeseries;
    this.formulaResults = new ArrayList<>();
  }

  public List<TimeSeriesResult> evaluate(List<FormulaQuery> formulas) {
    if (formulas == null) {
      return Collections.emptyList();
    }

    return formulas.stream().map(this::evaluateFormula).collect(Collectors.toList());
  }

  public TimeSeriesResult evaluateFormula(FormulaQuery query) {
    val variableSeries = Maps.<Long, Map<String, Double>>newTreeMap();
    for (TimeSeriesResult ts : IterableUtils.chainedIterable(timeseries, formulaResults)) {
      if (ts.getData() != null) {
        ts.getData()
            .forEach(
                e -> {
                  val timestamp = e.getTimestamp();
                  if (!variableSeries.containsKey(timestamp)) {
                    variableSeries.put(timestamp, Maps.newHashMap());
                  }

                  if (e.getValue() != null) {
                    variableSeries.get(timestamp).put(ts.getId(), e.getValue());
                  }
                });
      }
    }

    val evaluator =
        new FormulaEvaluator(
            query.getFormula(), query.getPrefixResults() ? query.getQueryId() : null);

    val entries =
        variableSeries.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(
                e -> {
                  val result = evaluator.evaluate(e.getValue());
                  val res = new TimeSeriesResult.MetricEntry();
                  res.setTimestamp(e.getKey());
                  res.setValue(result);
                  return res;
                })
            .collect(Collectors.toList());

    val result = new TimeSeriesResult();
    result.setId(query.getQueryId());
    result.setData(entries);
    if (!entries.isEmpty()) {
      result.setStartTime(entries.get(0).getTimestamp());
      result.setEndTime(entries.get(entries.size() - 1).getTimestamp());
    }
    // feedback formula results for use in later formulas.
    formulaResults.add(result);
    return result;
  }
}

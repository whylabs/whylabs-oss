package ai.whylabs.dataservice.metrics;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.metrics.query.FormulaQuery;
import ai.whylabs.dataservice.metrics.query.MetricQuery;
import ai.whylabs.dataservice.metrics.query.TimeSeriesQuery;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Data;
import lombok.val;
import net.minidev.json.annotate.JsonIgnore;
import org.joda.time.Interval;

@Data
public class TimeSeriesQueryRequest {
  public static final int MAX_TIMESERIES_QUERIES = 10;
  public static final int MAX_FORMULA_QUERIES = 20;

  @Schema(
      required = true,
      type = "string",
      example = "2023-11-01T00:00:00.000Z/P30D",
      description =
          "Required, return anomalies within this ISO-8601 time period,\n"
              + "inclusive of start and exclusive of end point.\n"
              + "e.g. \"2022-07-01T00:00:00.000Z/P30D\" or "
              + "\"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  Interval interval; //  ISO 8601 formatted interval

  @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
  DataGranularity rollupGranularity = DataGranularity.daily;

  @Schema(required = true, description = "List of timeseries to query")
  List<TimeSeriesQuery> timeseries;

  @Schema(
      description =
          "Optional, list of formulas to evaluate. Note that we don't validate formulas and will return null data if the formula is invalid.")
  List<FormulaQuery> formulas;

  @Schema(hidden = true)
  @JsonIgnore
  public List<FormulaQuery> getEffectiveFormulas() {
    val embeddedFormulas =
        timeseries.stream() //
            .map(TimeSeriesQuery::getEmbeddedFormula) //
            .filter(Objects::nonNull) //
            .distinct() //
            .collect(Collectors.toList());
    List<FormulaQuery> formulaQueries =
        Optional.ofNullable(formulas).orElse(Collections.emptyList());
    return ImmutableList.<FormulaQuery>builder()
        .addAll(embeddedFormulas)
        .addAll(formulaQueries)
        .build();
  }

  public void validate() {
    Preconditions.checkNotNull(interval, "interval is required");
    Preconditions.checkArgument(
        rollupGranularity != DataGranularity.individual,
        "Cannot specify individual granularity for timeseries");

    Preconditions.checkArgument(
        timeseries.size() <= MAX_TIMESERIES_QUERIES,
        "Cannot query more than %s timeseries",
        MAX_TIMESERIES_QUERIES);
    Preconditions.checkArgument(
        timeseries.size() > 0, "Query must contain at least one timeseries");
    timeseries.forEach(TimeSeriesQuery::validate);
    if (formulas == null) {
      formulas = Collections.emptyList();
    }
    Preconditions.checkArgument(
        timeseries.size() <= MAX_FORMULA_QUERIES,
        "Cannot query more than %s formulas",
        MAX_FORMULA_QUERIES);
    formulas.forEach(FormulaQuery::validate);

    Preconditions.checkArgument(
        timeseries.stream().map(MetricQuery::getQueryId).allMatch(new HashSet<>()::add),
        "Query ids must be unique");
    Preconditions.checkArgument(
        formulas.stream().map(MetricQuery::getQueryId).allMatch(new HashSet<>()::add),
        "Query ids must be unique");
  }
}

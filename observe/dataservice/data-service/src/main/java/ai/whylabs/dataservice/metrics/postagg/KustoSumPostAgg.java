package ai.whylabs.dataservice.metrics.postagg;

import com.fasterxml.jackson.annotation.JsonTypeName;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kusto statements to apply post-aggregation of kusto results. Aggregation might be something like
 * "sum(value)", or "max(value)". Post-aggregation further processed those results to extract the
 * target metric. Applying these objects will generate a kusto statement to extract metrics from
 * aggregated kusto results.
 */
@JsonTypeName(PostAggConstants.KUSTO)
@Data
@NoArgsConstructor
public class KustoSumPostAgg implements PostAgg {

  @Override
  public String toSql() {
    return String.format("sum(agg_data)");
  }
}

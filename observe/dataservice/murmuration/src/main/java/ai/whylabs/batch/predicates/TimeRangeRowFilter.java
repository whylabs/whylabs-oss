package ai.whylabs.batch.predicates;

import ai.whylabs.core.configV3.structure.TimeRange;
import ai.whylabs.core.predicatesV3.baseline.TimeRangePredicate;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import java.util.function.Predicate;
import lombok.AllArgsConstructor;
import org.apache.spark.sql.Row;

@AllArgsConstructor
public class TimeRangeRowFilter implements Predicate<Row> {
  private TimeRange range;

  @Override
  public boolean test(Row row) {
    return new TimeRangePredicate().test(range, row.getAs(Fields.ts));
  }
}

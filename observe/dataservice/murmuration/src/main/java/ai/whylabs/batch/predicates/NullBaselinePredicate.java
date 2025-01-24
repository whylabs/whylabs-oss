package ai.whylabs.batch.predicates;

import java.util.function.Predicate;
import org.apache.spark.sql.Row;

/** Null baselines reject all rows as part of their baseline */
public class NullBaselinePredicate implements Predicate<Row> {

  @Override
  public boolean test(Row row) {
    return false;
  }
}

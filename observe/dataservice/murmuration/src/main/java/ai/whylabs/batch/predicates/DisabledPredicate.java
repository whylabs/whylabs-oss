package ai.whylabs.batch.predicates;

import java.util.function.Predicate;
import org.apache.spark.sql.Row;

public class DisabledPredicate implements Predicate<Row> {

  @Override
  public boolean test(Row row) {
    return false;
  }
}

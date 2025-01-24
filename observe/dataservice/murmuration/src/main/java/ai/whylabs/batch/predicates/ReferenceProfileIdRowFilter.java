package ai.whylabs.batch.predicates;

import ai.whylabs.core.predicatesV3.baseline.ReferenceProfileIdPredicate;
import ai.whylabs.core.structures.DatalakeRow.Fields;
import java.util.function.Predicate;
import lombok.AllArgsConstructor;
import org.apache.spark.sql.Row;

@AllArgsConstructor
public class ReferenceProfileIdRowFilter implements Predicate<Row> {

  private String profileId;

  @Override
  public boolean test(Row row) {
    return new ReferenceProfileIdPredicate(profileId).test(row.getAs(Fields.profileId));
  }
}

package ai.whylabs.core.predicatesV3.baseline;

import java.util.function.Predicate;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class ReferenceProfileIdPredicate implements Predicate<String> {
  private String configProfileId;

  @Override
  public boolean test(String explodedRowProfileId) {
    if (explodedRowProfileId == null || configProfileId == null) {
      return false;
    } else if (explodedRowProfileId.equals(configProfileId)) {
      return true;
    }
    return false;
  }
}

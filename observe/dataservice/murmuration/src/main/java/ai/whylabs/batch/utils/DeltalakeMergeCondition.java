package ai.whylabs.batch.utils;

import java.io.Serializable;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Getter;
import lombok.Singular;

@Getter
@Builder
public class DeltalakeMergeCondition implements Serializable {
  // alias for the delta table
  @Builder.Default private final String table = "t";
  // alias for the source, or the dataframe whose data is being merged
  @Builder.Default private final String source = "s";

  @Singular private final List<String> fields;

  @Override
  public String toString() {
    return fields.stream()
        .map(it -> String.format("%s.%s = %s.%s", table, it, source, it))
        .collect(Collectors.joining(" AND "));
  }
}

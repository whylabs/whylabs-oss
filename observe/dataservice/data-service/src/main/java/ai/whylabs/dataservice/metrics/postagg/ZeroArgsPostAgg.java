package ai.whylabs.dataservice.metrics.postagg;

import lombok.*;

/**
 * Post aggregation that takes no arguments. Internal only. not available for public API Note that
 * we don't mark this with a subtype so it can't be ser/der via Jackson.
 */
@RequiredArgsConstructor(access = AccessLevel.PRIVATE)
public class ZeroArgsPostAgg implements PostAgg {

  public static ZeroArgsPostAgg of(String aggSql) {
    return new ZeroArgsPostAgg(aggSql);
  }

  private final String aggSql;

  @Override
  public String toSql() {
    return aggSql;
  }
}

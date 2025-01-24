package ai.whylabs.dataservice.metrics.postagg;

public class NoopPostAgg implements PostAgg {
  /**
   * No-op SQL post aggregator - used for metrics like classification whose results are extracted in
   * Java.
   */
  @Override
  public String toSql() {
    return "agg_data";
  }
}

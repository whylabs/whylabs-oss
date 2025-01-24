package ai.whylabs.dataservice.metrics.agg;

import lombok.Getter;

@Getter
public enum MetricPath {
  kll("distribution/kll"),
  hll("cardinality/hll"),
  variance("distribution/variance"),
  count("counts/n"),
  count_null("counts/null"),
  types_boolean("types/boolean"),
  types_fractional("types/fractional"),
  types_object("types/object"),
  types_integral("types/integral"),
  types_string("types/string"),
  classification("model/classification"),
  regression("model/regression"),
  frequent_strings("frequent_items/frequent_strings"),
  ignored(""),
  ;

  private final String path;

  MetricPath(String path) {
    this.path = path;
  }
}

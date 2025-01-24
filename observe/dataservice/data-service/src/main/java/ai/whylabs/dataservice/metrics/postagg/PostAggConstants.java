package ai.whylabs.dataservice.metrics.postagg;

import lombok.experimental.UtilityClass;

@UtilityClass
public class PostAggConstants {
  public static final String NOOP = "noop";
  public static final String QUANTILE = "quantile";
  public static final String UNIQUE_EST = "unique_est";
  public static final String CLASSIFICATION = "classification";
  public static final String KUSTO = "kusto";
}

package ai.whylabs.dataservice.metrics.spec;

import com.google.re2j.Pattern;

public class Constants {
  public static final Pattern BUILT_IN_METRIC_PATTERN =
      Pattern.compile("\\b(?:[a-zA-Z]+(?:_[a-zA-Z]+)*)\\b");
}

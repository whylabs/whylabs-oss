package ai.whylabs.dataservice.metrics.spec;

public enum Datasource {
  profiles,
  monitors,
  traces;

  // constant values needed for Jackson annotation
  public static final String PROFILE = "profiles";
  public static final String MONITOR = "monitors";
  public static final String TRACE = "traces";
}

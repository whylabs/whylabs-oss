package ai.whylabs.druid.whylogs.streaming;

public class StreamingConstants {

  public static final int MUTABILITY_WINDOW_DAYS = 1;

  /**
   * For the rollup datasource you can't have batch and streaming writing to the same time interval
   * so we draw a line in the sand. Realtime owns the STREAMING_ROLLUP_WINDOW_DAYS most recent and
   * historical batch owns everything older than that.
   */
  public static final Integer STREAMING_ROLLUP_WINDOW_DAYS = 7;

  public static final Integer STREAMING_DISCRETE_WINDOW_DAYS = 30;

  public static final Integer STREAMING_RREFERENCE_PROFILE_WINDOW_DAYS = 1;

  public static final int MUTABILITY_WINDOW_MILLIS =
      MUTABILITY_WINDOW_DAYS * 1000 * 60 * 60 * 24 * STREAMING_ROLLUP_WINDOW_DAYS;
  public static final int ONE_MEGABYTE = 1024 * 1024;
  public static final int THREE_HUNDRED_MEGABYTE = 300 * ONE_MEGABYTE;

  public static final int TEN_KB = 1024 * 10;
}

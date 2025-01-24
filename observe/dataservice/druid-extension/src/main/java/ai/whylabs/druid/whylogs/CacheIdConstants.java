package ai.whylabs.druid.whylogs;

/** Every class needs a unique cache ID or things get weird. Do not re-use. */
public class CacheIdConstants {
  public static final byte DISCRETE_POST_AGGREGATOR_CACHE_TYPE_ID = 0x50; // 80
  public static final byte INFERRED_TYPE_POST_AGGREGATOR_CACHE_TYPE_ID = 0x51; // 81
  public static final byte FREQUENCY_AGGREGATOR_FACTORY_CACHE_TYPE = 0x75; // 117
  public static final byte COLUMN_PROFILE_AGGREGATOR_FACTORY_CACHE_TYPE = 0x77; // 119
  public static final byte MODEL_METRICS_AGGREGATOR_FACTORY_CACHE_TYPE = 0x78; // 120
  public static final byte KLL_FLOATS_SKETCH_AGGREGATOR_FACTORY_CACHE_TYPE = 0x7A; // 122
  public static final byte KLL_FLOATS_SKETCH_TO_HISTOGRAM_POST_AGGREGATOR_CACHE_ID = 96;
  public static final byte FREQUENCY_TO_STRING_POST_AGGREGATOR_CACHE_ID = 97;
  public static final byte COLUMN_PROFILE_TO_STRING_POST_AGGREGATOR_CACHE_ID = 98;
  public static final byte CONFUSION_MATRIX_CACHE_ID = 99;
  public static final byte KLL_FLOATS_SKETCH_TO_BASE64_POST_AGGREGATOR_CACHE_ID = 101;
}

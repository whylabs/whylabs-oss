package ai.whylabs.batch.utils;

import java.util.Map;

public class TraceIdUtils {

  public static final String TRACE_ID = "whylabs.traceId";

  private static final int TRACE_ID_MAX_CHARS = 128;

  public static String getTraceId(Map<String, String> tagMap) {
    if (tagMap == null || !tagMap.containsKey(TRACE_ID)) {
      return null;
    }
    String traceId = tagMap.get(TRACE_ID);
    if (traceId.length() > TRACE_ID_MAX_CHARS) {
      return traceId.substring(0, TRACE_ID_MAX_CHARS);
    }
    return traceId;
  }
}

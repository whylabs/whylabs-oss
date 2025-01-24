package ai.whylabs.dataservice.util;

import ai.whylabs.dataservice.requests.SegmentTag;
import java.util.List;

public class SegmentsToArray {
  public static String[] toArray(List<SegmentTag> segment) {
    String[] segments = {};
    if (segment != null) {
      segments = segment.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
    }
    return segments;
  }
}

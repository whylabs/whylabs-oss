package ai.whylabs.core.predicatesV3.segment;

import ai.whylabs.core.configV3.structure.Segment;
import java.util.List;
import java.util.function.Predicate;
import lombok.val;
import org.apache.commons.lang.StringUtils;

/** Is this the overall segment? */
public class OverallSegmentPredicate implements Predicate<Segment> {

  @Override
  public boolean test(Segment segment) {
    if (segment.getTags() == null || segment.getTags().size() == 0) {
      // This is the overall segment
      return true;
    }
    if (segment.getTags().size() == 1) {
      val t = segment.getTags().get(0);
      if (StringUtils.isEmpty(t.getKey()) && StringUtils.isEmpty(t.getValue())) {
        return true;
      }
    }
    return false;
  }

  public boolean containsOverall(List<Segment> segments) {
    if (segments == null || segments.size() == 0) {
      return true;
    }
    for (val s : segments) {
      if (test(s)) {
        return true;
      }
    }
    return false;
  }
}

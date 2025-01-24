package ai.whylabs.core.predicatesV3.segment;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.utils.SegmentUtils;
import java.util.List;
import java.util.function.BiPredicate;
import lombok.val;
import org.apache.commons.lang.StringUtils;

/** Does this target match the analyzer's segment? */
public class TargetSegmentPredicate implements BiPredicate<QueryResultStructure, Analyzer> {

  @Override
  public boolean test(QueryResultStructure target, Analyzer analyzer) {
    return test(target.getSegmentText(), analyzer);
  }

  public boolean test(String segmentText, Analyzer analyzer) {
    boolean match = test(analyzer.getTarget().getSegments(), segmentText);
    if (analyzer.getTarget().getExcludeSegments() != null
        && test(analyzer.getTarget().getExcludeSegments(), segmentText)) {
      return false;
    }
    return match;
  }

  /**
   * match segments between analyzer configs and profile segments. Return True if profile
   * `segmentText` matches any `segments` from analyzer configs.
   *
   * <p>`segments` contains segments from any analyzer configs. `segmentText` is a single profile.
   */
  private boolean test(List<Segment> segments, String segmentText) {
    if (segments == null || segments.size() == 0) {
      // When nothing is targeted we assume it's the overall segment they want
      return StringUtils.isEmpty(segmentText);
    }
    val segmentPredicate = new SegmentPredicate();
    val overallSegmentPredicate = new OverallSegmentPredicate();

    for (val segment : segments) {
      if (overallSegmentPredicate.test(segment) && StringUtils.isEmpty(segmentText)) {
        return true;
      }
      val targetTags = SegmentUtils.parseSegmentV3(segmentText);
      if (targetTags.size() == segment.getTags().size()
          && segmentPredicate.test(segment, targetTags).isPresent()) {
        return true;
      }
    }

    return false;
  }
}

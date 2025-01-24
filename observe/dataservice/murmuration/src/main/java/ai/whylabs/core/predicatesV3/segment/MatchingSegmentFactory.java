package ai.whylabs.core.predicatesV3.segment;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.core.utils.SegmentUtils;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.val;

public class MatchingSegmentFactory {
  private static OverallSegmentPredicate overallSegmentPredicate = new OverallSegmentPredicate();

  /**
   * Given a list of all analyzers for a monitor config, find all matching tags from a single
   * profile. Note that segment filters from all analyzers are scanned at once. Returns a map from
   * profile tags to analyzer segment filter, e.g. {city=durham=Segment(tags=[Tag(key=city,
   * value=*)])}
   *
   * @param analyzers - all analyzers from a single monitor config
   * @param segmentTags - segment tags from a single profile.
   */
  public static Map<String, Segment> getApplicableSegmentsForProfile(
      List<Analyzer> analyzers, List<Tag> segmentTags) {
    Map<Segment, Segment> matched = getApplicableSegments(analyzers, segmentTags);
    Map<String, Segment> r = new HashMap<>();
    for (val m : matched.entrySet()) {
      r.put(SegmentUtils.toStringV3(m.getKey().getTags()), m.getValue());
    }
    return r;
  }

  /**
   * Called multiple times per-model as part of fanout to profiles with matching segments. Collect
   * segment tags that match the segment filters in *any* analyzer.
   *
   * @param analyzers - all active analyzers in a monitor config
   * @param segmentTags - all segment tags, presumably associated with a single profile?
   */
  public static Map<Segment, Segment> getApplicableSegments(
      List<Analyzer> analyzers, List<Tag> segmentTags) {
    Set<Segment> uniqueSegments = new HashSet();

    // extract set of distinct segment filters from all active analyzers.
    //     e.g. [Segment(tags=[Tag(key=age, value=old)]),
    //           Segment(tags=[Tag(key=gender, value=female), Tag(key=age, value=old)])]
    for (Analyzer analyzer : analyzers) {
      if (analyzer.getTarget().getSegments() == null
          || analyzer.getTarget().getSegments().size() == 0) {
        uniqueSegments.add(Segment.builder().tags(new ArrayList<>()).build());
      } else {
        uniqueSegments.addAll(analyzer.getTarget().getSegments());
      }
    }

    // for each unique analyzer segment filter, find all tags in `segmentTags` that match that
    // filter.
    // Create map from matching tags to segment filter.
    // in most cases this will result in an uninteresting map that looks like identical key-value
    // pairs,
    // e.g. {Segment(age=old)=Segment(age=old),
    //       Segment(gender=female, age=old)=Segment(gender=female, age=old)}
    // but if the segment filter uses wildcards, then the values will be concrete matching segments.
    // e.g. {Segment(age=old)=Segment(age=*)
    //
    Map<Segment, Segment> uniqueSegmentStrings = new HashMap<>();
    for (Segment s : uniqueSegments) {
      Optional<List<Tag>> matched = new SegmentPredicate().test(s, segmentTags);
      if (matched.isPresent() && matched.get().size() == s.getTags().size()) {
        uniqueSegmentStrings.put(new Segment(matched.get()), s);
      }
      if (overallSegmentPredicate.test(s)) {
        uniqueSegmentStrings.put(new Segment(), new Segment());
      }
    }

    return uniqueSegmentStrings;
  }

  /**
   * Important to note the distinction between zero and null matters with feature importance.
   * However druid's null support is pretty weak so what may be null in the datalake can show up as
   * zero in druid.
   */
  public static Double getFieldWeight(MonitorConfigV3 config, Segment segment, String column) {
    if (config.getWeightConfig() == null) {
      return null;
    }
    Double weight = null;

    if (config.getWeightConfig().getDefaultWeights() != null
        && config.getWeightConfig().getDefaultWeights().getWeights() != null
        && config.getWeightConfig().getDefaultWeights().getWeights().get(column) != null) {
      weight = config.getWeightConfig().getDefaultWeights().getWeights().get(column);
    }

    if (config.getWeightConfig().getSegmentWeights() != null) {
      for (val segmentWeight : config.getWeightConfig().getSegmentWeights()) {

        if (segmentWeight.getWeights() != null) {
          val a = SegmentUtils.toStringV3(segment.getTags());
          // Null segments are expected (the overall segment), comes back as ""
          val b = SegmentUtils.toStringV3(segmentWeight.getSegment());
          if (!a.equals(b)) {
            continue;
          }

          Double overrideWeight = segmentWeight.getWeights().get(column);
          if (overrideWeight != null) {
            return overrideWeight;
          }
          return weight;
        }
      }
    }
    return weight;
  }
}

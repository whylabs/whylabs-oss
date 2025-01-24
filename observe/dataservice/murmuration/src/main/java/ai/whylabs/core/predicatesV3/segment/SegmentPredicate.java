package ai.whylabs.core.predicatesV3.segment;

import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.Tag;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class SegmentPredicate {
  public static final String WILDCARD = "*";

  /**
   * Check if a profile belongs to a segment and if it does which subset of tags made were matched
   * against.
   */
  public Optional<List<Tag>> test(Segment segment, List<Tag> segmentTagList) {
    List<Tag> matchingTags = new ArrayList<>();
    if (segment.getTags() == null || segment.getTags().size() == 0) {
      return Optional.empty();
    }

    for (Tag configTag : segment.getTags()) {
      boolean tagMatchFound = false;
      for (Tag profileTag : segmentTagList) {
        if (configTag.getKey().equals(profileTag.getKey())) {
          if (configTag.getValue().equals(profileTag.getValue())
              || configTag.getValue().equals(WILDCARD)) {
            tagMatchFound = true;
            matchingTags.add(profileTag);
          }
        }
      }
      if (!tagMatchFound) {
        return Optional.empty();
      }
    }

    return Optional.of(matchingTags);
  }
}

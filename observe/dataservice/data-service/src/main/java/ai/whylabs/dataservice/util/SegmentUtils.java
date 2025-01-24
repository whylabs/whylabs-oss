package ai.whylabs.dataservice.util;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import ai.whylabs.core.configV3.structure.Segment;
import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.core.predicatesV3.segment.SegmentPredicate;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.responses.GetFeatureWeightsResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.Lists;
import java.util.*;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.Nullable;

public class SegmentUtils {

  @VisibleForTesting
  public static final ThreadLocal<ObjectMapper> MAPPER = ThreadLocal.withInitial(ObjectMapper::new);

  public static final Comparator<Tag> TAG_ORDER_V3 =
      Comparator.comparing(Tag::getKey).thenComparing(Tag::getValue);

  public static final Comparator<SegmentTag> TAG_ORDER =
      Comparator.comparing(SegmentTag::getKey).thenComparing(SegmentTag::getValue);

  public static Double extractWeight(
      GetFeatureWeightsResponse getFeatureWeightsResponse, Segment segment, String column) {
    if (getFeatureWeightsResponse != null
        && getFeatureWeightsResponse.getSegmentWeights() != null) {
      val p = new SegmentPredicate();
      for (val w : getFeatureWeightsResponse.getSegmentWeights()) {
        if (segment == null) {
          if ((w.getSegment() == null || w.getSegment().size() == 0)
              && w.getWeights().containsKey(column)) {
            return w.getWeights().get(column);
          }
        } else {
          val match = p.test(segment, w.getSegment());
          if (match.isPresent() && w.getWeights().containsKey(column)) {
            return w.getWeights().get(column);
          }
        }
      }
    }

    return 1.0;
  }

  @NonNull
  public static String toStringV3(@Nullable List<Tag> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("&", toStringsV3(tags));
  }

  public static List<String> toStringsV3(List<Tag> tags) {
    if (tags == null || tags.isEmpty()) {
      return Collections.emptyList();
    }
    val copy = Lists.newArrayList(tags);
    copy.sort(TAG_ORDER_V3);
    return copy.stream()
        .filter(t -> isNotBlank(t.getKey()))
        .filter(t -> isNotBlank(t.getValue()))
        .map(it -> it.getKey().replace('&', '_') + "=" + it.getValue().replace('&', '_'))
        .collect(Collectors.toList());
  }

  public static List<SegmentTag> toSegmentTags(String[] tagsText) throws IllegalArgumentException {
    return toSegmentTags(Arrays.asList(tagsText));
  }

  public static List<SegmentTag> toSegmentTags(List<String> tagsText)
      throws IllegalArgumentException {
    val parsed = parseTagsV3(tagsText);
    List<SegmentTag> segmentTags = new ArrayList<>(tagsText.size());
    for (val p : parsed) {
      segmentTags.add(SegmentTag.builder().key(p.getKey()).value(p.getValue()).build());
    }
    return segmentTags;
  }

  public static List<Tag> parseTagsV3(List<String> tagsText) throws IllegalArgumentException {

    val result =
        tagsText.stream()
            .filter(i -> i.contains("="))
            .map(it -> StringUtils.split(it, "=", 2))
            .map(
                it -> {
                  final Tag res = new Tag();
                  res.setKey(it[0]);
                  // missing tag values are ok, e.g. key=
                  res.setValue(it.length > 1 ? it[1] : "");
                  return res;
                })
            .distinct()
            .sorted(TAG_ORDER_V3)
            .collect(Collectors.toList());
    return Collections.unmodifiableList(result);
  }

  public static List<Tag> parseSegmentV3(String segmentText) {
    if (StringUtils.isEmpty(segmentText)) {
      return Collections.emptyList();
    }
    val tagTexts = Arrays.stream(segmentText.split("&")).collect(Collectors.toList());
    val tags = parseTagsV3(tagTexts);
    return tags;
  }

  public static List<String> reorderSegmentTags(List<String> source) {
    if (source != null) {
      List<String> corrected = new ArrayList<>(source.size());
      for (String segment : source) {
        corrected.add(SegmentUtils.toStringV3(SegmentUtils.parseSegmentV3(segment)));
      }
      return corrected;
    }
    return null;
  }

  public static String toQueryableJson(List<List<SegmentTag>> requestSegments)
      throws JsonProcessingException {
    if (requestSegments == null) {
      return null;
    }
    List<List<String>> segments = new ArrayList<>();
    for (val seg : requestSegments) {
      val segmentTags =
          seg.stream().map(s -> s.getKey() + "=" + s.getValue()).toArray(String[]::new);
      segments.add(Arrays.asList(segmentTags));
    }

    return MAPPER.get().writeValueAsString(segments);
  }

  @NonNull
  public static String toString(@Nullable List<SegmentTag> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("&", toStrings(tags));
  }

  public static List<String> toStrings(List<SegmentTag> tags) {
    if (tags == null || tags.isEmpty()) {
      return Collections.emptyList();
    }
    return tags.stream()
        .filter(t -> isNotBlank(t.getKey()))
        .filter(t -> isNotBlank(t.getValue()))
        .sorted(TAG_ORDER)
        .map(it -> it.getKey().replace('&', '_') + "=" + it.getValue().replace('&', '_'))
        .collect(Collectors.toList());
  }
}

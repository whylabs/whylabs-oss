package ai.whylabs.core.utils;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.core.structures.songbird.Segment;
import ai.whylabs.core.structures.songbird.SegmentTag;
import com.fasterxml.jackson.core.util.MinimalPrettyPrinter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.collect.Lists;
import com.google.common.hash.Hashing;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class SegmentUtils {

  @VisibleForTesting
  public static final ThreadLocal<ObjectMapper> MAPPER = ThreadLocal.withInitial(ObjectMapper::new);

  public static final String EMPTY_SEGMENT_HASH =
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945";

  public static final Comparator<SegmentTag> TAG_ORDER =
      Comparator.comparing(SegmentTag::getKey).thenComparing(SegmentTag::getValue);

  public static final Comparator<Tag> TAG_ORDER_V3 =
      Comparator.comparing(Tag::getKey).thenComparing(Tag::getValue);

  private static final ThreadLocal<ObjectWriter> WRITER =
      ThreadLocal.withInitial(() -> MAPPER.get().writer(new MinimalPrettyPrinter()));

  public static final String SEGMENT_HASH = "segmentHash";

  public static final Segment EMPTY_SEGMENT = new Segment();

  static {
    EMPTY_SEGMENT.setTags(Collections.emptyList());
  }

  @SneakyThrows
  @VisibleForTesting
  @NotNull
  public static String doHash(JsonNode tags) {
    val minimalText = WRITER.get().writeValueAsString(tags);

    //noinspection UnstableApiUsage
    return Hashing.sha256().hashString(minimalText, StandardCharsets.UTF_8).toString();
  }

  @SneakyThrows
  public String hashSegmentString(List<String> segmentText) {
    val tags = parseTags(segmentText);
    return hashSegmentTags(tags);
  }

  @NonNull
  public static String toStringV3(@Nullable List<Tag> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("&", toStringsV3(tags));
  }

  public static String toString(Map<String, String> map) {
    List<Tag> tags = new ArrayList<>(map.size());
    for (val m : map.entrySet()) {
      tags.add(Tag.builder().key(m.getKey()).value(m.getValue()).build());
    }
    return toStringV3(tags);
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

  @Deprecated
  @NonNull
  public static String toString(@Nullable List<SegmentTag> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("&", toStrings(tags));
  }

  @Deprecated
  public static List<String> toStrings(List<SegmentTag> tags) {
    if (tags == null || tags.isEmpty()) {
      return Collections.emptyList();
    }
    val copy = Lists.newArrayList(tags);
    copy.sort(TAG_ORDER);
    return copy.stream()
        .filter(t -> isNotBlank(t.getKey()))
        .filter(t -> isNotBlank(t.getValue()))
        .map(it -> it.getKey().replace('&', '_') + "=" + it.getValue().replace('&', '_'))
        .collect(Collectors.toList());
  }

  public static String hashSegmentTags(List<SegmentTag> tags) {
    if (tags == null || tags.isEmpty()) {
      return EMPTY_SEGMENT_HASH;
    }

    val arr = MAPPER.get().createArrayNode();
    val ts =
        tags.stream()
            .map(it -> MAPPER.get().createObjectNode().put(it.getKey(), it.getValue()))
            .collect(Collectors.toList());
    arr.addAll(ts);
    return doHash(arr);
  }

  /**
   * Return a sorted list of tags based on {@link #TAG_ORDER}
   *
   * @param tagsText the list of tag texts in the format of key=value
   * @return a list of parsed {@link SegmentTag} objects in sorted order
   */
  @Deprecated
  public static List<SegmentTag> parseTags(List<String> tagsText) {
    val result =
        tagsText.stream()
            .filter(i -> i.contains("="))
            .map(it -> it.split("="))
            // TODO: handle if the value is null? ignore?
            .filter(it -> it.length > 1)
            .map(
                it -> {
                  final SegmentTag res = new SegmentTag();
                  res.setKey(it[0]);
                  res.setValue(it[1]);
                  return res;
                })
            .sorted(TAG_ORDER)
            .collect(Collectors.toList());
    return Collections.unmodifiableList(result);
  }

  public static List<Tag> parseTagsV3(List<String> tagsText) {
    val result =
        tagsText.stream()
            .filter(i -> i.contains("="))
            .map(it -> it.split("="))
            // TODO: handle if the value is null? ignore?
            .filter(it -> it.length > 1)
            .map(
                it -> {
                  final Tag res = new Tag();
                  res.setKey(it[0]);
                  res.setValue(it[1]);
                  return res;
                })
            .distinct()
            .sorted(TAG_ORDER_V3)
            .collect(Collectors.toList());
    return Collections.unmodifiableList(result);
  }

  public static Segment parseSegment(String segmentText) {
    if (StringUtils.isEmpty(segmentText)) {
      return EMPTY_SEGMENT;
    }
    val tagTexts = Arrays.stream(segmentText.split("&")).collect(Collectors.toList());
    val tags = parseTags(tagTexts);

    val segment = new Segment();
    segment.setTags(tags);
    return segment;
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

  public static Map<String, String> parseSegmentV3AsMap(String segmentText) {
    val l = parseSegmentV3(segmentText);
    Map<String, String> tagMap = new HashMap();
    for (val tag : l) {
      tagMap.put(tag.getKey(), tag.getValue());
    }
    return tagMap;
  }

  /** In postgres tags are stored as a collection of k=v pairs in jsonb format. Produce that */
  @SneakyThrows
  public static String parseSegmentV3AsJsonCollection(String segmentText) {
    val l = parseSegmentV3(segmentText);
    List<String> tagList = new ArrayList<>(l.size());
    for (val it : l) {
      String entry = it.getKey().replace('&', '_') + "=" + it.getValue().replace('&', '_');
      tagList.add(entry);
    }
    return WRITER.get().writeValueAsString(tagList);
  }
}

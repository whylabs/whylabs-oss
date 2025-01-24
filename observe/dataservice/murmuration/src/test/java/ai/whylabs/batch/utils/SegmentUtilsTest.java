package ai.whylabs.batch.utils;

import static ai.whylabs.core.utils.SegmentUtils.EMPTY_SEGMENT_HASH;
import static ai.whylabs.core.utils.SegmentUtils.MAPPER;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;

import ai.whylabs.core.configV3.structure.Tag;
import ai.whylabs.core.structures.songbird.SegmentTag;
import ai.whylabs.core.utils.SegmentUtils;
import com.google.common.collect.ImmutableList;
import java.util.ArrayList;
import java.util.List;
import lombok.val;
import org.hamcrest.CoreMatchers;
import org.testng.annotations.Test;

public class SegmentUtilsTest {

  // same as
  // https://gitlab.com/whylabs/dashboard-service/-/blob/233b4a1f47cc0e556138049f5b79921eebb453cf/src/util/hashes.spec.ts
  @Test
  public void emptyHash() {
    val emptyArr = MAPPER.get().createArrayNode();
    val result = SegmentUtils.doHash(emptyArr);
    assertThat(result, is(EMPTY_SEGMENT_HASH));
  }

  @Test
  public void test_empty_tagValue() {
    val tags = SegmentUtils.parseTagsV3(ImmutableList.of("city=seattle", "color="));
    val expected = new Tag();
    expected.setKey("city");
    expected.setValue("seattle");
    assertThat(tags, CoreMatchers.is(ImmutableList.of(expected)));
  }

  @Test
  public void test_handle_ampersand() {
    val tag = new Tag();
    tag.setKey("city&");
    tag.setValue("seattle&");

    assertThat(SegmentUtils.toStringV3(ImmutableList.of(tag)), is("city_=seattle_"));
  }

  @Test
  public void hashTags() {
    List<SegmentTag> tags = new ArrayList<>();

    val a = new SegmentTag();
    a.setKey("a");
    a.setValue("b");
    tags.add(a);

    // Should be put at the end rather than the middle
    val b = new SegmentTag();
    b.setKey("y");
    b.setValue("z");
    tags.add(b);

    val c = new SegmentTag();
    c.setKey("c");
    c.setValue("d");
    tags.add(c);

    String segmentText = SegmentUtils.toString(tags);
    assertThat(segmentText, is("a=b&c=d&y=z"));
  }
}

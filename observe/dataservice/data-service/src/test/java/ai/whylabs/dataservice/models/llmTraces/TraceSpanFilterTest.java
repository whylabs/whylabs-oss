package ai.whylabs.dataservice.models.llmTraces;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import ai.whylabs.dataservice.models.*;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;
import lombok.val;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

public class TraceSpanFilterTest {
  private static final String coordinatesFilterStatement =
      "| where isnotempty(PromptCoords) or isnotempty(ResponseCoords)";

  @Test
  public void testEmptyFilter() {
    val filter = new TraceSpanFilter();
    val whereClauses = filter.buildFilters();
    assertThat(whereClauses, is(Collections.emptyList()));
  }

  @Test
  public void testIdsFilter() {
    val filter =
        TraceSpanFilter.builder()
            .traceIdSubstring("2")
            .traceIds(List.of("id1", "id2"))
            .excludeIds(List.of("id3"))
            .build();
    val whereClauses = filter.buildFilters();
    assertThat(
        whereClauses,
        is(
            List.of(
                "TraceId matches regex \"^.*2.*\"",
                "TraceId has_any (\"id1\" , \"id2\")",
                "not(TraceId has_any (\"id3\"))")));
  }

  @Test
  public void testEmptyEmbeddingsFilter() {
    val filter =
        TraceSpanFilter.builder().tags(null).embeddingType(null).behaviorType(null).build();
    val whereClauses = filter.buildEmbeddingsFilters();
    assertThat(whereClauses, is(List.of()));
  }

  private static Stream<Arguments> embeddingTypeTestCases() {
    return Stream.of(
        Arguments.of(
            EmbeddingType.prompt,
            List.of("| where Type == \"prompt\""),
            "should filter by traces that has prompt coordinates"),
        Arguments.of(
            EmbeddingType.response,
            List.of("| where Type == \"response\""),
            "should filter by traces that has response coordinate"));
  }

  @DisplayName("Testing embeddings filter with embeddingType only")
  @ParameterizedTest(name = "{2}")
  @MethodSource("embeddingTypeTestCases")
  public void testEmbeddingsFilterWithEmbeddingTypeOnly(
      EmbeddingType input, List<String> expected, String testName) {
    val filter = TraceSpanFilter.builder().embeddingType(input).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static final String SUMMARIZE_STATEMENT =
      "| summarize Events = make_list(ExpandedEvents), Coords=make_list(Coords, 3) by TraceId, SpanId, Type";

  private static final String COMMON_VALIDATION_EVENT_FILTER =
      "| where ExpandedEvents.EventName == \"whylabs.secure.validation\" and ExpandedEvents.EventAttributes.metric contains strcat(Type, \".\")";

  private static Stream<Arguments> behaviorTypeTestCases() {
    return Stream.of(
        Arguments.of(
            SpanBehaviorType.observe,
            List.of(
                "| mv-expand ExpandedEvents",
                "| where not(ExpandedEvents.EventName == \"whylabs.secure.validation\" and ExpandedEvents.EventAttributes.metric contains strcat(Type, \".\"))"),
            "should filter by traces that has no violations at all"),
        Arguments.of(
            SpanBehaviorType.flag,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"flag\""),
            "should filter by traces that has flagged violations"),
        Arguments.of(
            SpanBehaviorType.block,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"block\""),
            "should filter by traces that has blocked violations"));
  }

  @DisplayName("Testing embeddings filter with behaviorType only")
  @ParameterizedTest(name = "{2}")
  @MethodSource("behaviorTypeTestCases")
  public void testEmbeddingsFilterWithBehaviorTypeOnly(
      SpanBehaviorType input, List<String> expected, String testName) {
    val filter = TraceSpanFilter.builder().behaviorType(input).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static Stream<Arguments> tagsTestCases() {
    return Stream.of(
        Arguments.of(
            Collections.emptyList(),
            null,
            Collections.emptyList(),
            "empty tags should not alter the base query filtering by traces that has some coordinates"),
        Arguments.of(
            List.of("bad_actors", "customer_experience"),
            null,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.metric has_any (\"bad_actors\" , \"customer_experience\")"),
            "should filter by traces that has some bad actors OR customer experience violation"),
        Arguments.of(
            List.of("bad_actors", "customer_experience"),
            Condition.and,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.metric has_all (\"bad_actors\" , \"customer_experience\")"),
            "should filter by traces that has bad actors AND customer experience violation"));
  }

  @DisplayName("Testing embeddings filter with violation tags only")
  @ParameterizedTest(name = "{3}")
  @MethodSource("tagsTestCases")
  public void testEmbeddingsFilterWithTagsOnly(
      List<String> tags, Condition tagCondition, List<String> expected, String testName) {
    val filter = TraceSpanFilter.builder().tags(tags).tagCondition(tagCondition).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static Stream<Arguments> embeddingTypeAndBehaviorTestCases() {
    return Stream.of(
        Arguments.of(
            EmbeddingType.prompt,
            SpanBehaviorType.observe,
            List.of(
                "| where Type == \"prompt\"",
                "| mv-expand ExpandedEvents",
                "| where not(ExpandedEvents.EventName == \"whylabs.secure.validation\" and ExpandedEvents.EventAttributes.metric contains strcat(Type, \".\"))"),
            "should filter traces with no prompt violations"),
        Arguments.of(
            EmbeddingType.prompt,
            SpanBehaviorType.flag,
            List.of(
                "| where Type == \"prompt\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"flag\""),
            "should filter traces with prompt flag violations"),
        Arguments.of(
            EmbeddingType.response,
            SpanBehaviorType.block,
            List.of(
                "| where Type == \"response\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"block\""),
            "should filter traces with response flag violations"));
  }

  @DisplayName("Testing embeddings filter with embeddingType and behaviorType")
  @ParameterizedTest(name = "{3}")
  @MethodSource("embeddingTypeAndBehaviorTestCases")
  public void testEmbeddingsFilterWithEmbeddingTypeAndBehavior(
      EmbeddingType type, SpanBehaviorType behavior, List<String> expected, String testName) {
    val filter = TraceSpanFilter.builder().embeddingType(type).behaviorType(behavior).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static Stream<Arguments> embeddingTypeAndTagsTestCases() {
    return Stream.of(
        Arguments.of(
            EmbeddingType.prompt,
            List.of("bad_actors", "customer_experience"),
            null,
            List.of(
                "| where Type == \"prompt\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.metric has_any (\"bad_actors\" , \"customer_experience\")"),
            "should filter traces with some prompt bad actors OR customer experience violation"),
        Arguments.of(
            EmbeddingType.response,
            List.of("bad_actors", "customer_experience"),
            Condition.and,
            List.of(
                "| where Type == \"response\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.metric has_all (\"bad_actors\" , \"customer_experience\")"),
            "should filter traces with prompt bad actors AND customer experience violation"));
  }

  @DisplayName("Testing embeddings filter with embeddingType and violation tags")
  @ParameterizedTest(name = "{4}")
  @MethodSource("embeddingTypeAndTagsTestCases")
  public void testEmbeddingsFilterWithEmbeddingTypeAndTags(
      EmbeddingType type,
      List<String> tags,
      Condition tagCondition,
      List<String> expected,
      String testName) {
    val filter =
        TraceSpanFilter.builder().embeddingType(type).tags(tags).tagCondition(tagCondition).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static Stream<Arguments> behaviorTypeAndTagsTestCases() {
    return Stream.of(
        Arguments.of(
            SpanBehaviorType.observe,
            List.of("bad_actors", "customer_experience"),
            null,
            List.of(
                "| mv-expand ExpandedEvents",
                "| where not(ExpandedEvents.EventName == \"whylabs.secure.validation\" and ExpandedEvents.EventAttributes.metric contains strcat(Type, \".\"))"),
            "should filter traces with no violations, ignoring the tags"),
        Arguments.of(
            SpanBehaviorType.flag,
            List.of("bad_actors", "customer_experience"),
            null,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"flag\" and ExpandedEvents.EventAttributes.metric has_any (\"bad_actors\" , \"customer_experience\")"),
            "should filter traces some flagged bad actors OR customer experience violation"),
        Arguments.of(
            SpanBehaviorType.block,
            List.of("bad_actors", "customer_experience"),
            Condition.and,
            List.of(
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"block\" and ExpandedEvents.EventAttributes.metric has_all (\"bad_actors\" , \"customer_experience\")"),
            "should filter traces with blocked bad actors AND customer experience violation"));
  }

  @DisplayName("Testing embeddings filter with behaviorType and violation tags")
  @ParameterizedTest(name = "{4}")
  @MethodSource("behaviorTypeAndTagsTestCases")
  public void testEmbeddingsFilterWithBehaviorTypeAndTags(
      SpanBehaviorType behavior,
      List<String> tags,
      Condition tagCondition,
      List<String> expected,
      String testName) {
    val filter =
        TraceSpanFilter.builder()
            .behaviorType(behavior)
            .tags(tags)
            .tagCondition(tagCondition)
            .build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }

  private static Stream<Arguments> allEmbeddingsFilterTestCases() {
    return Stream.of(
        Arguments.of(
            EmbeddingType.prompt,
            SpanBehaviorType.flag,
            List.of("bad_actors"),
            List.of(
                "| where Type == \"prompt\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"flag\" and ExpandedEvents.EventAttributes.metric has_any (\"bad_actors\")"),
            "should filter traces with prompt flagged bad actors violations"),
        Arguments.of(
            EmbeddingType.response,
            SpanBehaviorType.block,
            List.of("bad_actors", "misuse"),
            List.of(
                "| where Type == \"response\"",
                "| mv-expand ExpandedEvents",
                COMMON_VALIDATION_EVENT_FILTER
                    + " and ExpandedEvents.EventAttributes.failure_level == \"block\" and ExpandedEvents.EventAttributes.metric has_any (\"bad_actors\" , \"misuse\")"),
            "should filter traces with response blocked bad actors OR misuse violations"));
  }

  @DisplayName("Testing embeddings filter with embeddingType, behaviorType and violation tags")
  @ParameterizedTest(name = "{4}")
  @MethodSource("allEmbeddingsFilterTestCases")
  public void testEmbeddingsFilterWIthAllProps(
      EmbeddingType type,
      SpanBehaviorType behavior,
      List<String> tags,
      List<String> expected,
      String testName) {
    val filter =
        TraceSpanFilter.builder().embeddingType(type).behaviorType(behavior).tags(tags).build();
    val embeddingsFilterClauses = filter.buildEmbeddingsFilters();
    assertThat(embeddingsFilterClauses, is(expected));
  }
}

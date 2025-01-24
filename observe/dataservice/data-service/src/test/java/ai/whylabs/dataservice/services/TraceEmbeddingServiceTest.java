package ai.whylabs.dataservice.services;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertNull;

import ai.whylabs.dataservice.BasePostgresTest;
import ai.whylabs.dataservice.models.EmbeddingType;
import ai.whylabs.dataservice.models.SpanBehaviorType;
import ai.whylabs.dataservice.models.TraceSpanFilter;
import ai.whylabs.dataservice.models.llmTraces.LlmSecureEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;
import javax.inject.Inject;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

@Slf4j
@MicronautTest
public class TraceEmbeddingServiceTest extends BasePostgresTest {

  @Inject private TraceEmbeddingService traceEmbeddingService;
  @Inject private ObjectMapper objectMapper;

  private static final String TRACE_ID = "2c76f9f64ab3fc732742f48d0cbe6772";
  private static final String SPAN_ID = "e244c892500a8b8b";

  private static Stream<Arguments> embeddingsCoordsUseCases() {
    return Stream.of(
        Arguments.of(List.of(0.13, 0.33, -0.5)), Arguments.of(List.of(0.122, 0.333, -0.11)));
  }

  @ParameterizedTest
  @MethodSource("embeddingsCoordsUseCases")
  public void testEmbeddingCoordinates(List<Double> coordsList) {
    val coords = objectMapper.valueToTree(coordsList);
    val events = objectMapper.valueToTree(Collections.emptyList());
    val filter = TraceSpanFilter.builder().build();
    val embedding =
        traceEmbeddingService.handleTraceEmbedding(
            "prompt", coords, events, TRACE_ID, SPAN_ID, null, null, null, filter);
    assertThat(embedding.getX(), is(coordsList.get(0)));
    assertThat(embedding.getY(), is(coordsList.get(1)));
    assertThat(embedding.getZ(), is(coordsList.get(2)));
  }

  private static Stream<Arguments> flaggedEmbeddingsTestCases() {
    return Stream.of(
        Arguments.of(
            List.of(0.23, 0.333, -0.1),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.misuse")
                            .failure_level(
                                "block") // event with block, should return flag due to the behavior
                            // filter
                            // applied below
                            .build())
                    .build()),
            TraceSpanFilter.builder().behaviorType(SpanBehaviorType.flag).build(),
            SpanBehaviorType.flag),
        Arguments.of(
            List.of(0.23, 0.333, -0.1),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.misuse")
                            .failure_level("block")
                            .build())
                    .build()),
            TraceSpanFilter.builder().tags(List.of("customer_experience")).build(),
            SpanBehaviorType.flag),
        Arguments.of(
            List.of(0.2223, 0.433, -0.121),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.misuse")
                            .failure_level(
                                "block") // should match the most critical failure between filtered
                            // tags
                            .build())
                    .build()),
            TraceSpanFilter.builder().tags(List.of("customer_experience", "misuse")).build(),
            SpanBehaviorType.block));
  }

  @ParameterizedTest
  @MethodSource("flaggedEmbeddingsTestCases")
  public void testGetBehaviorConsideringFilters(
      List<Double> coordsList,
      List<LlmSecureEvent> eventsList,
      TraceSpanFilter filter,
      SpanBehaviorType expected) {
    val coords = objectMapper.valueToTree(coordsList);
    val events = objectMapper.valueToTree(eventsList);
    val embedding =
        traceEmbeddingService.handleTraceEmbedding(
            "response", coords, events, TRACE_ID, SPAN_ID, null, null, null, filter);
    assertThat(embedding.getBehavior(), is(expected.toString()));
  }

  private static Stream<Arguments> embeddingsWithoutFiltersUseCases() {
    return Stream.of(
        Arguments.of(
            List.of(0.13, 0.33, -0.5),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.bad_actors")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.misuse")
                            .failure_level("block")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build()),
            SpanBehaviorType.block),
        Arguments.of(
            List.of(0.33, 0.53, -0.15),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.bad_actors")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.misuse")
                            .failure_level("block")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build()),
            SpanBehaviorType.block),
        Arguments.of(
            List.of(0.13, 0.33, -0.5),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.customer_experience")
                            .failure_level("flag")
                            .build())
                    .build()),
            SpanBehaviorType.observe),
        Arguments.of(
            List.of(0.122, 0.333, -0.11), Collections.emptyList(), SpanBehaviorType.observe));
  }

  @ParameterizedTest
  @MethodSource("embeddingsWithoutFiltersUseCases")
  public void testGetBehaviorWithoutFilters(
      List<Double> coordsList, List<LlmSecureEvent> eventsList, SpanBehaviorType expected) {
    val coords = objectMapper.valueToTree(coordsList);
    val events = objectMapper.valueToTree(eventsList);
    val embedding =
        traceEmbeddingService.handleTraceEmbedding(
            "prompt", coords, events, TRACE_ID, SPAN_ID, null, null, null, new TraceSpanFilter());
    assertThat(embedding.getBehavior(), is(expected.toString()));
  }

  private static Stream<Arguments> invalidEmbeddingsUseCases() {
    return Stream.of(
        Arguments.of(
            EmbeddingType.response,
            List.of(0.13, 0.33, -0.5),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("response.score.bad_actors")
                            .failure_level("flag")
                            .build())
                    .build(),
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.misuse")
                            .failure_level("block") // will not match because it's a prompt metric
                            .build())
                    .build()),
            TraceSpanFilter.builder().tags(List.of("misuse")).build()),
        Arguments.of(
            EmbeddingType.response,
            List.of(0.23, 0.53, -0.55),
            List.of(
                LlmSecureEvent.builder()
                    .EventName("whylabs.secure.validation")
                    .EventAttributes(
                        LlmSecureEvent.Attributes.builder()
                            .metric("prompt.score.bad_actors")
                            .failure_level("flag")
                            .build())
                    .build()),
            TraceSpanFilter.builder().tags(List.of("customer_experience")).build()));
  }

  @ParameterizedTest
  @MethodSource("invalidEmbeddingsUseCases")
  public void testInvalidEmbeddingsForFilters(
      EmbeddingType type,
      List<Double> coordsList,
      List<LlmSecureEvent> eventsList,
      TraceSpanFilter filter) {
    val coords = objectMapper.valueToTree(coordsList);
    val events = objectMapper.valueToTree(eventsList);
    val embedding =
        traceEmbeddingService.handleTraceEmbedding(
            type.toString(), coords, events, TRACE_ID, SPAN_ID, null, null, null, filter);

    assertNull(embedding);
  }
}

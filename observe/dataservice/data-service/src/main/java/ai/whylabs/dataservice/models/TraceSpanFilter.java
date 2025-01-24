package ai.whylabs.dataservice.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.google.common.collect.ImmutableList;
import io.swagger.v3.oas.annotations.media.Schema;
import java.text.MessageFormat;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;
import lombok.*;
import lombok.experimental.FieldNameConstants;

@Builder(toBuilder = true)
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Data
public class TraceSpanFilter {
  @Nullable private List<String> traceIds;
  @Nullable private List<String> excludeIds;
  @Nullable private List<String> spanIds;

  @JsonPropertyDescription("Optional, filter by violation tags")
  @Nullable
  private List<String> tags;

  @FieldNameConstants.Exclude @Nullable private Condition tagCondition;

  @JsonPropertyDescription("Optional, filter by secure validation event failure level or observed")
  @Nullable
  private SpanBehaviorType behaviorType;

  @JsonPropertyDescription("Optional, filter by type prompt or response")
  @Nullable
  private EmbeddingType embeddingType;

  @JsonPropertyDescription(
      "Optional, return embeddings from traces that partial matches the regex.")
  @Schema(type = "string", example = "c34db6f817", requiredMode = Schema.RequiredMode.NOT_REQUIRED)
  String traceIdSubstring;

  @JsonIgnore
  public List<String> buildFilters() {
    val builder = ImmutableList.<String>builder();
    if (traceIdSubstring != null) {
      builder.add(String.format("TraceId matches regex \"^.*%s.*\"", traceIdSubstring));
    }
    if (traceIds != null && !traceIds.isEmpty()) {
      builder.add(
          MessageFormat.format("TraceId has_any (\"{0}\")", String.join("\" , \"", traceIds)));
    }
    if (excludeIds != null && !excludeIds.isEmpty()) {
      builder.add(
          MessageFormat.format(
              "not(TraceId has_any (\"{0}\"))", String.join("\" , \"", excludeIds)));
    }
    if (spanIds != null && !spanIds.isEmpty()) {
      builder.add(
          MessageFormat.format("SpanId has_any (\"{0}\")", String.join("\" , \"", spanIds)));
    }
    return builder.build();
  }

  @JsonIgnore
  public List<String> buildEmbeddingsFilters() {
    val builder = ImmutableList.<String>builder();
    if (embeddingType != null) {
      builder.add(MessageFormat.format("| where Type == \"{0}\"", embeddingType));
    }
    val usedTags = Optional.ofNullable(tags).orElse(Collections.emptyList());
    val searchOnEvents = behaviorType != null || !usedTags.isEmpty();
    if (!searchOnEvents) return builder.build();
    val filterMetricByEmbeddingType =
        " and ExpandedEvents.EventAttributes.metric contains strcat(Type, \".\")";
    // need to transform empty to null to avoid filter rows out by mv-expand
    builder.add("| mv-expand ExpandedEvents");
    if (behaviorType == SpanBehaviorType.observe) {
      builder.add(
          "| where not(ExpandedEvents.EventName == \"whylabs.secure.validation\""
              + filterMetricByEmbeddingType
              + ")");
      return builder.build();
    }
    var validationEventFilter =
        "| where ExpandedEvents.EventName == \"whylabs.secure.validation\""
            + filterMetricByEmbeddingType;
    if (behaviorType != null) {
      validationEventFilter +=
          MessageFormat.format(
              " and ExpandedEvents.EventAttributes.failure_level == \"{0}\"", behaviorType);
    }
    if (!usedTags.isEmpty()) {
      // default to Condition.or
      val operator = tagCondition == Condition.and ? "has_all" : "has_any";
      validationEventFilter +=
          MessageFormat.format(
              " and ExpandedEvents.EventAttributes.metric {0} (\"{1}\")",
              operator, String.join("\" , \"", usedTags));
    }
    builder.add(validationEventFilter);
    return builder.build();
  }
}

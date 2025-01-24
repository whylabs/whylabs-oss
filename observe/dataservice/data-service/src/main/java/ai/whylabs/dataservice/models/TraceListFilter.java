package ai.whylabs.dataservice.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.common.collect.ImmutableList;
import com.microsoft.azure.kusto.data.ClientRequestProperties;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import lombok.*;
import lombok.experimental.FieldNameConstants;

@Builder(toBuilder = true)
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Data
@FieldNameConstants(asEnum = true)
public class TraceListFilter {
  @FieldNameConstants.Exclude @Nullable private List<String> tags;
  @FieldNameConstants.Exclude @Nullable private Condition tagCondition;
  @FieldNameConstants.Exclude @Nullable private List<String> excludeTags;
  @FieldNameConstants.Exclude @Nullable private Integer minPolicyIssues;
  @FieldNameConstants.Exclude @Nullable private Integer maxPolicyIssues;
  @FieldNameConstants.Exclude @Nullable private Integer minTotalTokens;
  @FieldNameConstants.Exclude @Nullable private Integer maxTotalTokens;
  @FieldNameConstants.Exclude @Nullable private Integer minLatencyMillis;
  @FieldNameConstants.Exclude @Nullable private Integer maxLatencyMillis;
  @FieldNameConstants.Exclude @Nullable private Boolean onlyActions;
  @FieldNameConstants.Exclude @Nullable private List<String> traceIds;
  @FieldNameConstants.Exclude @Nullable List<String> excludeIds;
  @FieldNameConstants.Exclude @Nullable String traceIdSubstring;

  @FieldNameConstants.Exclude @Nullable String searchTerm;
  @Nullable private String serviceName;

  @JsonIgnore
  List<String> applyQueryParams(ClientRequestProperties properties) {
    // NOTE: we don't pass tags into the param list because it's a list of strings
    if (serviceName != null) {
      properties.setParameter(TraceQueryRequest.Filter.Fields.serviceName.name(), serviceName);
    }

    return Arrays.stream(Fields.values())
        .map(Fields::name)
        .map(key -> key + ":string=\"\"")
        .collect(Collectors.toList());
  }

  @JsonIgnore
  List<String> buildFilters() {
    val builder = ImmutableList.<String>builder();
    if (traceIdSubstring != null) {
      builder.add(String.format("TraceId matches regex \"^.*%s.*\"", traceIdSubstring));
    }
    if (searchTerm != null) {
      builder.add(
          String.format(
              "TraceId matches regex \"^.*%s.*\" or ResourceAttributes matches regex \"^.*%s.*\"",
              searchTerm, searchTerm));
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
    if (minTotalTokens != null) {
      builder.add("TotalTokens >= " + minTotalTokens);
    }
    if (maxTotalTokens != null) {
      builder.add("TotalTokens <= " + maxTotalTokens);
    }
    if (minPolicyIssues != null) {
      builder.add("array_length(Tags) >= " + minPolicyIssues);
    }
    if (maxPolicyIssues != null) {
      builder.add("array_length(Tags) <= " + maxPolicyIssues);
    }
    if (minLatencyMillis != null) {
      builder.add("Latency >= " + minLatencyMillis);
    }
    if (maxLatencyMillis != null) {
      builder.add("Latency <= " + maxLatencyMillis);
    }
    if (onlyActions != null && onlyActions) {
      builder.add("array_length(Actions) > 0");
    }
    if (serviceName != null) {
      builder.add(
          String.format(
              "ResourceAttributes['service.name'] contains %s",
              TraceQueryRequest.Filter.Fields.serviceName.name()));
    }
    if (tags != null && !tags.isEmpty()) {
      // default to Condition.or
      val operator = tagCondition == Condition.and ? "has_all" : "has_any";
      builder.add(
          MessageFormat.format("Tags {0} (\"{1}\")", operator, String.join("\" , \"", tags)));
    }
    if (excludeTags != null && !excludeTags.isEmpty()) {
      builder.add(
          MessageFormat.format("not(Tags has_all (\"{0}\"))", String.join("\" , \"", excludeTags)));
    }
    return builder.build();
  }
}

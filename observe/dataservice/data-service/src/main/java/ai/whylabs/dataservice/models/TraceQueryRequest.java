package ai.whylabs.dataservice.models;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.microsoft.azure.kusto.data.ClientRequestProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import org.joda.time.Interval;

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode(exclude = {"offset", "limit"})
public class TraceQueryRequest {
  public static final Predicate<String> ATTRIBUTE_KEY_PATTERN =
      Pattern.compile("^[a-zA-Z0-9\\.\\-_]+$").asPredicate();
  public static final Predicate<String> ATTRIBUTE_VALUE_PATTERN =
      Pattern.compile("^[a-zA-Z0-9 \\.\\-_]+$").asPredicate();

  @Schema(example = "org-123")
  String orgId;

  @Schema(example = "model-1")
  String resourceId;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string", example = "2023-11-01T00:00:00.000Z/P30D")
  Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, filter by top level keys or service name")
  Filter filter;

  @Schema(nullable = true)
  List<KeyValuePair> resourceAttributeFilters;

  @Schema(nullable = true)
  List<KeyValuePair> attributeFilters;

  Integer offset;
  Integer limit;

  @Schema(description = "Sort by start time. Default is descending")
  Boolean asc;

  @JsonIgnore
  public List<String> applyQueryParams(ClientRequestProperties properties) {
    validate();

    properties.setParameter("orgId", orgId);
    properties.setParameter("resourceId", resourceId);
    properties.setParameter("startTime", interval.getStart().toDate());
    properties.setParameter("endTime", interval.getEnd().toDate());

    return ImmutableList.<String>builder()
        .addAll(filter.applyQueryParams(properties)) //
        .add("orgId:string") //
        .add("resourceId:string") //
        .add("startTime:datetime") //
        .add("endTime:datetime") //
        .build();
  }

  @JsonIgnore
  public List<String> buildWhereClauses() {
    val builder = ImmutableList.<String>builder();
    builder.add("ResourceId == resourceId");
    builder.add("OrgId == orgId");
    builder.add("StartTime >= startTime");
    builder.add("StartTime <= endTime");
    builder.addAll(filter.buildFilters());

    if (resourceAttributeFilters != null) {
      resourceAttributeFilters.forEach(
          kv -> {
            builder.add(String.format("ResourceAttributes has \"%s\"", kv.getValue()));
            builder.add(
                String.format("ResourceAttributes['%s'] ==  \"%s\"", kv.getKey(), kv.getValue()));
          });
    }

    if (attributeFilters != null) {
      attributeFilters.forEach(
          kv -> {
            builder.add(String.format("TraceAttributes has \"%s\"", kv.getValue()));
            builder.add(
                String.format("TraceAttributes['%s'] ==  \"%s\"", kv.getKey(), kv.getValue()));
          });
    }
    return builder.build().stream().map(s -> "| where " + s).collect(Collectors.toList());
  }

  @Builder(toBuilder = true)
  @EqualsAndHashCode
  @NoArgsConstructor
  @AllArgsConstructor
  @Data
  @FieldNameConstants(asEnum = true)
  public static class Filter {
    @FieldNameConstants.Exclude @Nullable private List<String> tags;
    @FieldNameConstants.Exclude @Nullable private Condition tagCondition;
    @FieldNameConstants.Exclude @Nullable private List<String> excludeTags;
    @Nullable private String serviceName;
    @Nullable private String traceId;
    @Nullable private String spanId;
    @Nullable private String parentId;

    @JsonIgnore
    List<String> applyQueryParams(ClientRequestProperties properties) {
      // NOTE: we don't pass tags into the param list because it's a list of strings
      if (serviceName != null) {
        properties.setParameter(Fields.serviceName.name(), serviceName);
      }
      if (traceId != null) {
        properties.setParameter(Fields.traceId.name(), traceId);
      }
      if (spanId != null) {
        properties.setParameter(Fields.spanId.name(), spanId);
      }
      if (parentId != null) {
        properties.setParameter(Fields.parentId.name(), parentId);
      }

      return Arrays.stream(Fields.values())
          .map(Fields::name)
          .map(key -> key + ":string=\"\"")
          .collect(Collectors.toList());
    }

    @JsonIgnore
    List<String> buildFilters() {
      val builder = ImmutableList.<String>builder();
      if (traceId != null) {
        builder.add("TraceId == " + Fields.traceId.name());
      }
      if (spanId != null) {
        builder.add("SpanId == " + Fields.spanId.name());
      }
      if (parentId != null) {
        builder.add("ParentId == " + Fields.parentId.name());
      }
      if (serviceName != null) {
        builder.add("ResourceAttributes has serviceName");
        builder.add(
            String.format(
                "ResourceAttributes['service.name'] contains %s", Fields.serviceName.name()));
      }
      if (tags != null) {
        if (tagCondition == Condition.and) {
          tags.forEach(t -> builder.add(MessageFormat.format("Tags has_any (\"{0}\")", t)));
        } else {
          // default to Condition.or
          builder.add(MessageFormat.format("Tags has_any (\"{0}\")", String.join("\" , \"", tags)));
        }
      }
      if (excludeTags != null) {
        excludeTags.forEach(
            t -> builder.add(MessageFormat.format("not(Tags has_any (\"{0}\"))", t)));
      }
      return builder.build();
    }
  }

  @JsonIgnore
  public void validate() {
    Preconditions.checkArgument(interval != null, "interval must be specified");

    orgId = orgId.trim();
    Preconditions.checkArgument(isNotBlank(orgId), "orgId is required");
    resourceId = resourceId.trim();
    Preconditions.checkArgument(isNotBlank(resourceId), "resourceId is required");

    // apply nullness
    filter = Optional.ofNullable(filter).orElse(new Filter());
    resourceAttributeFilters =
        Optional.ofNullable(resourceAttributeFilters).orElse(Collections.emptyList());
    attributeFilters = Optional.ofNullable(attributeFilters).orElse(Collections.emptyList());

    // apply parameters
    resourceAttributeFilters.forEach(
        kv -> {
          Preconditions.checkArgument(
              isNotBlank(kv.getKey()), "resourceAttributeFilters key is required");
          Preconditions.checkArgument(
              isNotBlank(kv.getValue()),
              "resourceAttributeFilters value is required for key '%s'",
              kv.getKey());
          Preconditions.checkArgument(
              ATTRIBUTE_KEY_PATTERN.test(kv.getKey()),
              "resourceAttributeFilters: '%s' key not allowed",
              kv.getKey());
          Preconditions.checkArgument(
              ATTRIBUTE_VALUE_PATTERN.test(kv.getKey()),
              "resourceAttributeFilters: '%s' value not allowed",
              kv.getValue());
        });

    attributeFilters.forEach(
        kv -> {
          Preconditions.checkArgument(isNotBlank(kv.getKey()), "attributeFilters key is required");
          Preconditions.checkArgument(
              isNotBlank(kv.getValue()),
              "attributeFilters value is required for key %s",
              kv.getKey());
          Preconditions.checkArgument(
              ATTRIBUTE_KEY_PATTERN.test(kv.getKey()),
              "attributeFilters: %s key not allowed",
              kv.getKey());
          Preconditions.checkArgument(
              ATTRIBUTE_VALUE_PATTERN.test(kv.getKey()),
              "attributeFilters: %s value not allowed",
              kv.getValue());
        });
  }

  @Value
  static class KeyValuePair {
    String key;
    String value;
  }
}

package ai.whylabs.dataservice.requests;

import ai.whylabs.dataservice.enums.SortOrder;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.shaded.whylabs.com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.sql.Timestamp;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.Data;
import lombok.experimental.FieldNameConstants;
import lombok.val;
import org.hibernate.query.Query;
import org.joda.time.Interval;

@FieldNameConstants
@Data
public class QueryDebugEventsRequest {
  public static final int DEFAULT_PAGE_SIZE = 100;
  private static final String CREATION_TIMESTAMP = "creationTimestamp";
  private static final String TRACE_ID = "traceId";
  private static final String DATASET_TIMESTAMP = "datasetTimestamp";

  @JsonPropertyDescription("Required, orgId")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("Required, datasetId")
  @Schema(required = true)
  private String datasetId;

  private String traceId;

  @JsonPropertyDescription(
      "Required, return metrics on this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P7D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\". Must be 1 week or less in duration.")
  @Schema(
      required = true,
      type = "string",
      example = "2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z")
  private Interval interval; //  ISO 8601 formatted interval

  @JsonPropertyDescription("Optional, filter to specific segment tags")
  @Schema(required = false)
  private List<SegmentTag> segmentTags;

  @Schema(
      description = "Optional, filter to specific tags",
      example = "[\"llm\"]",
      required = false)
  private List<String> tags;

  @Schema(description = "Optional, if we want to paginate from the offset")
  private Integer startOffset;

  @Schema(
      description =
          "Optional. Maximum number of entries to return. Default to " + DEFAULT_PAGE_SIZE,
      example = "100",
      minimum = "1",
      maximum = "500")
  private Integer maxPageSize;

  // TODO: support json path filter
  @Schema(description = "Json path filter to further apply on the query", hidden = true)
  private String jsonPathFilter;

  @Schema(
      description = "Selector to apply on the content to extract specific sub field",
      hidden = true)
  private String selector;

  @Schema(
      description = "Field to order by",
      allowableValues = {CREATION_TIMESTAMP, TRACE_ID, DATASET_TIMESTAMP},
      example = "creationTimestamp")
  private String orderBy = "creationTimestamp";

  @Schema(description = "Order, (desc, asc). Default desc")
  private SortOrder order = SortOrder.desc;

  @JsonIgnore
  public String orderByClause() {
    val orderClause = order != null ? " " + order.name() : "";
    switch (orderBy) {
      case CREATION_TIMESTAMP:
        return "order by d.creation_timestamp" + orderClause;
      case TRACE_ID:
        return "order by d.trace_id" + orderClause;
      case DATASET_TIMESTAMP:
        return "order by d.dataset_timestamp" + orderClause;
      default:
        throw new IllegalArgumentException("Unsupported orderBy " + orderBy);
    }
  }

  @JsonIgnore
  public void createQuery(Query<?> query) {
    Preconditions.checkArgument(jsonPathFilter == null, "jsonPathFilter is not supported yet");
    Preconditions.checkArgument(selector == null, "selector is not supported yet");
    Preconditions.checkNotNull(interval, "Interval must not be null");

    query.setParameter("orgId", orgId);
    query.setParameter("datasetId", datasetId);
    query.setParameter("startTS", new Timestamp(interval.getStartMillis()));
    query.setParameter("endTS", new Timestamp(interval.getEndMillis()));

    val segmentTagParams =
        Optional.ofNullable(segmentTags).orElse(Collections.emptyList()).stream() //
            .filter(Objects::nonNull) //
            .map(t -> t.getKey() + "=" + t.getValue()) //
            .toArray(String[]::new);
    query.setParameter("segmentTags", segmentTagParams);
    query.setParameter(
        "tags", Optional.ofNullable(tags).orElse(Collections.emptyList()).toArray(new String[0]));
    query.setParameter("traceId", traceId);
    query.setParameter("offset", startOffset);
    int pageSize = Optional.ofNullable(maxPageSize).orElse(DEFAULT_PAGE_SIZE);
    // add 1 to the query to detect if we need to paginate
    query.setParameter("limit", pageSize + 1);

    query.setCacheable(true);
  }

  @JsonIgnore
  public int getEffectiveMaxPageSize() {
    return Optional.ofNullable(maxPageSize).orElse(DEFAULT_PAGE_SIZE);
  }
}

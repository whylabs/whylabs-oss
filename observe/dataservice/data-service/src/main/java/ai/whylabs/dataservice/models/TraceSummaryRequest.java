package ai.whylabs.dataservice.models;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.google.common.base.Preconditions;
import com.google.common.collect.ImmutableList;
import com.microsoft.azure.kusto.data.ClientRequestProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.stream.Collectors;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.val;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.joda.time.Interval;

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode
public class TraceSummaryRequest {
  @Schema(example = "org-123")
  String orgId;

  @Schema(example = "model-1")
  String resourceId;

  @JsonPropertyDescription(
      "Required, return anomalies within this ISO-8601 time period,\ninclusive of start and exclusive of end point.\ne.g. \"2022-07-01T00:00:00.000Z/P30D\" or \"2022-07-01T00:00:00.000Z/2022-07-01T00:00:00.000Z\"")
  @Schema(required = true, type = "string", example = "2023-11-01T00:00:00.000Z/P30D")
  Interval interval; //  ISO 8601 formatted interval

  Granularity granularity;

  @JsonIgnore
  public List<String> applyQueryParams(ClientRequestProperties properties) {
    validate();

    properties.setParameter("orgId", orgId);
    properties.setParameter("resourceId", resourceId);
    properties.setParameter("startTime", interval.getStart().toDate());
    properties.setParameter("endTime", interval.getEnd().toDate());

    val builder =
        ImmutableList.<String>builder()
            .add("orgId:string") //
            .add("resourceId:string") //
            .add("startTime:datetime") //
            .add("endTime:datetime");
    return builder.build();
  }

  @JsonIgnore
  public List<String> buildWhereClauses() {
    val builder = ImmutableList.<String>builder();
    builder.add("ResourceId == resourceId");
    builder.add("OrgId == orgId");
    builder.add("StartTime >= startTime");
    builder.add("StartTime < endTime");
    return builder.build().stream().map(s -> "| where " + s).collect(Collectors.toList());
  }

  @JsonIgnore
  public Pair<String, String> getGranularityDateTime() {
    if (granularity == Granularity.daily) {
      return new ImmutablePair<>("yyyy-MM-dd", " 00:00:00");
    }
    return new ImmutablePair<>("yyyy-MM-dd HH", ":00:00");
  }

  @JsonIgnore
  public void validate() {
    Preconditions.checkArgument(interval != null, "interval must be specified");

    orgId = orgId.trim();
    Preconditions.checkArgument(isNotBlank(orgId), "orgId is required");
    resourceId = resourceId.trim();
    Preconditions.checkArgument(isNotBlank(resourceId), "resourceId is required");
  }
}

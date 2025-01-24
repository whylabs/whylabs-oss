package ai.whylabs.dataservice.models;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

@Builder(toBuilder = true)
@Data
@EqualsAndHashCode
public class TraceDataRangeRequest {
  @Schema(example = "org-123")
  String orgId;

  @Schema(example = "model-1")
  String resourceId;

  @JsonIgnore
  public List<String> applyQueryParams(ClientRequestProperties properties) {
    validate();

    properties.setParameter("orgId", orgId);
    properties.setParameter("resourceId", resourceId);

    val builder =
        ImmutableList.<String>builder()
            .add("orgId:string") //
            .add("resourceId:string");
    return builder.build();
  }

  @JsonIgnore
  public List<String> buildWhereClauses() {
    val builder = ImmutableList.<String>builder();
    builder.add("ResourceId == resourceId");
    builder.add("OrgId == orgId");
    return builder.build().stream().map(s -> "| where " + s).collect(Collectors.toList());
  }

  @JsonIgnore
  public void validate() {
    orgId = orgId.trim();
    Preconditions.checkArgument(isNotBlank(orgId), "orgId is required");
    resourceId = resourceId.trim();
    Preconditions.checkArgument(isNotBlank(resourceId), "resourceId is required");
  }
}

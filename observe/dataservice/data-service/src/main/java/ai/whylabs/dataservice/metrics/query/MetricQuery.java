package ai.whylabs.dataservice.metrics.query;

import ai.whylabs.dataservice.requests.SegmentTag;
import com.google.common.base.Preconditions;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import lombok.Data;

@Data
public abstract class MetricQuery {
  private static Pattern QUERY_ID_PATTERN =
      Pattern.compile("^[a-zA-Z0-9]+([a-zA-Z0-9_\\-]*[a-zA-Z0-9]+)*$");

  @Schema(example = "a", requiredMode = Schema.RequiredMode.REQUIRED)
  String queryId;

  String resourceId;
  String columnName;

  @Schema(
      example = "[{\"key\": \"region\", \"value\": \"us-east-1\"}]",
      description = "Optional, filter by segment tags. Uses [] if not specified")
  List<SegmentTag> segment = Collections.emptyList();

  public void validate() {
    Preconditions.checkArgument(queryId != null, "queryId is required");
    Preconditions.checkArgument( //
        QUERY_ID_PATTERN.matcher(queryId).matches(),
        "queryId doesn't match the required format %",
        QUERY_ID_PATTERN.pattern());
  }
}

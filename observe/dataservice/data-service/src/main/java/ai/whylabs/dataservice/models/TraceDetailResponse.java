package ai.whylabs.dataservice.models;

import com.fasterxml.jackson.annotation.JsonRawValue;
import java.util.Date;
import java.util.List;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Builder
@Value
public class TraceDetailResponse {
  String id;
  @JsonRawValue String resourceAttributes;
  Date startTime;
  Date endTime;
  Integer latency;
  Integer totalTokens;
  Integer completionTokens;
  Integer promptTokens;
  @Singular List<String> tags;
  @JsonRawValue @Singular List<String> entries;
}

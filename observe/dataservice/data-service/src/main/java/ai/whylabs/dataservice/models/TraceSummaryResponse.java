package ai.whylabs.dataservice.models;

import com.fasterxml.jackson.annotation.JsonRawValue;
import java.util.List;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Builder
@Value
public class TraceSummaryResponse {
  @JsonRawValue @Singular List<String> entries;
}

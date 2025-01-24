package ai.whylabs.dataservice.models;

import com.fasterxml.jackson.annotation.JsonRawValue;
import java.util.List;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Builder
@Value
public class TraceQueryResponse {

  @JsonRawValue @Singular List<String> entries;
  Integer nextOffset;
  Boolean partial;
  Integer total;
}

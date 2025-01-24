package ai.whylabs.dataservice.models;

import javax.annotation.Nullable;
import lombok.Builder;
import lombok.Value;

@Builder
@Value
public class TraceEmbeddingDataRow {
  Double x;
  Double y;
  Double z;
  String traceId;
  String spanId;
  String type;
  String behavior;
  @Nullable String dataTag;
  @Nullable Integer dataVersion;
  @Nullable Integer dataMajorVersion;
}

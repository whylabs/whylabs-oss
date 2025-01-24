package ai.whylabs.dataservice.models;

import java.util.List;
import javax.annotation.Nullable;
import lombok.Builder;
import lombok.Value;

@Builder
@Value
public class TraceEmbeddingsCategoryDataset {
  List<Double> x;
  List<Double> y;
  List<Double> z;
  List<String> traceId;
  List<String> spanId;
  String type;
  String behavior;
  @Nullable String dataTag;
  @Nullable Integer dataVersion;
  @Nullable Integer dataMajorVersion;
}

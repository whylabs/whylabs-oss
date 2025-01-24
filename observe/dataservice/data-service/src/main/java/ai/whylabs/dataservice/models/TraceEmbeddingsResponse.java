package ai.whylabs.dataservice.models;

import java.util.Map;
import java.util.Set;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;

@Builder
@Value
public class TraceEmbeddingsResponse {
  @Singular Map<String, TraceEmbeddingsCategoryDataset> entries;
  Integer nextOffset;
  Boolean partial;
  Integer count;
  Set<String> relevantDatasets;
}

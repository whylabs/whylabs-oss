package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.LinkedHashMap;
import lombok.Data;
import lombok.NonNull;

@Data
public class NumericMetricsForTimeRangeResponse {

  @JsonPropertyDescription("All results are part of this org.")
  @NonNull
  private final String orgId;

  @JsonPropertyDescription("Map of dataset ids to pairs of column names and their value.")
  @NonNull
  private final LinkedHashMap<String, LinkedHashMap<String, Double>> datasetIdToColumnsAndValues;

  @Data
  public static class DatasetTimestampToAccuracy {
    private final long timestamp;

    private final double accuracy;
  }

  private final LinkedHashMap<String, DatasetTimestampToAccuracy> datasetIdToAccuracy;

  @Data
  public static class DatasetTimestampToCount {
    private final long timestamp;

    private final long count;
  }

  private final LinkedHashMap<String, DatasetTimestampToCount> datasetIdToCount;

  @Data
  public static class DatasetTimestampToSummary {
    private final long timestamp;

    private final ClassificationSummaryRow summary;
  }

  private final LinkedHashMap<String, DatasetTimestampToSummary> datasetIdToSummary;
}

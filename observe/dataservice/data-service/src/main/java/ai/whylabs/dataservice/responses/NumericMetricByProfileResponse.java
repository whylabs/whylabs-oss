package ai.whylabs.dataservice.responses;

import ai.whylabs.dataservice.requests.SegmentTag;
import java.util.Arrays;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import org.joda.time.Instant;

@Data
@Builder
public class NumericMetricByProfileResponse {
  private List<SegmentTag> segment;
  Long lastUploadTimestamp;
  Long datasetTimestamp;
  String metricName;
  Double metricValue;
  String retrievalToken;
  String traceId;

  public List<Object> asCSV() {
    return Arrays.asList(Instant.ofEpochMilli(datasetTimestamp), metricName, metricValue);
  }
}

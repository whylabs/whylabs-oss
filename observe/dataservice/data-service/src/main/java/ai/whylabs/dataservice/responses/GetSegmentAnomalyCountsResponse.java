package ai.whylabs.dataservice.responses;

import lombok.Data;

@Data
public class GetSegmentAnomalyCountsResponse {

  final String segment;
  final int anomalyCount;
}

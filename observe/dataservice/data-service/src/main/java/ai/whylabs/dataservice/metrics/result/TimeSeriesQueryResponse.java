package ai.whylabs.dataservice.metrics.result;

import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class TimeSeriesQueryResponse {
  UUID id;
  QueryResultStatus status;
  List<TimeSeriesResult> timeseries;
  List<TimeSeriesResult> formulas;
  int successCount;
  int failureCount;

  String errorCode;
  List<String> errorMessages;
}

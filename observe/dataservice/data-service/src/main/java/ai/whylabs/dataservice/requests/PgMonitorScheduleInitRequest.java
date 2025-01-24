package ai.whylabs.dataservice.requests;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.Data;

@Data
public class PgMonitorScheduleInitRequest {
  @JsonPropertyDescription(
      "Optional, return metrics on this ISO-8601 time period eg 2022-07-01T00:00:00.000Z. Initialize schedules to a date in the past (great for load testing)")
  public String backdate;
}

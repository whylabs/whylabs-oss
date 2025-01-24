package ai.whylabs.dataservice.responses;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GetAdHocRunNumEventsResponse {
  @JsonPropertyDescription("Number of events found in requested timeframe")
  Long numAdHocEvents;
}

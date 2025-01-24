package ai.whylabs.dataservice.responses;

import ai.whylabs.core.configV3.structure.CustomerEvent;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class GetCustomerEventsResponse {
  private List<CustomerEvent> customerEvents;
}

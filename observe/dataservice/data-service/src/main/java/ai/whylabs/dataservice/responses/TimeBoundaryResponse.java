package ai.whylabs.dataservice.responses;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TimeBoundaryResponse {

  private List<TimeBoundaryResponseRow> rows;
}

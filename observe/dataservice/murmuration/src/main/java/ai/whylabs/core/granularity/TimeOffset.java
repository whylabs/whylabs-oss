package ai.whylabs.core.granularity;

import java.time.temporal.ChronoUnit;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class TimeOffset {
  private ChronoUnit granularity;
  private Long amount;
}

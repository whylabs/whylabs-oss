package ai.whylabs.adhoc.resolvers;

import java.time.ZonedDateTime;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode
@Builder
public class QueryTimeRange {
  private ZonedDateTime start;
  private ZonedDateTime end;
}

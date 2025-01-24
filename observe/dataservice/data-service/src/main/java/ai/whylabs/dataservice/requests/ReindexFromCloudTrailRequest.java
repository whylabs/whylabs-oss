package ai.whylabs.dataservice.requests;

import java.time.ZonedDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReindexFromCloudTrailRequest {
  ZonedDateTime start;
  ZonedDateTime end;
  String bucket;
  String prefix;
}

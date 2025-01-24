package ai.whylabs.ingestion.payloads;

import java.time.ZonedDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReindexFromS3Request {
  ZonedDateTime start;
  ZonedDateTime end;
  String bucket;
}

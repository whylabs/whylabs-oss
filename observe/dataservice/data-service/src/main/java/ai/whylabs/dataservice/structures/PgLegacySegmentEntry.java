package ai.whylabs.dataservice.structures;

import io.micronaut.core.annotation.Introspected;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity(name = "legacy_segments")
@Table(name = "whylabs.legacy_segments")
@Introspected
public class PgLegacySegmentEntry {
  @Id private Long id;
  private String org_id;
  private String dataset_id;
  private String segment_text;
  private Long latest_dataset_timestamp;
  private Long oldest_dataset_timestamp;
  private Long latest_upload_timestamp;
  private Long oldest_upload_timestamp;
}

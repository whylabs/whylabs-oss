package ai.whylabs.dataservice.streaming;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import io.micronaut.core.annotation.Introspected;
import javax.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@Builder(toBuilder = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Entity(name = "audit_row")
@Table(name = "whylabs.profile_upload_audit")
@Introspected
@TypeDef(name = "audit_state_enum", typeClass = PostgreSQLEnumType.class)
// Prevent entity updates. audit table should be updated via updateAuditLog.
@Immutable
public class AuditRow {

  public enum IngestState {
    pending,
    processing,
    ingested,
    failed
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @NonNull private String orgId;
  private String datasetId;

  @Column(name = "s3_path")
  private String filePath;

  private String referenceId;
  private String ingestMethod;

  @Enumerated(EnumType.STRING)
  @Type(type = "audit_state_enum")
  private IngestState state;

  Long size; // size of original bin file, in bytes

  // timestamps all store in epoch millis
  @Convert(converter = PostgresTimestampConverter.class)
  @Column(name = "dataset_timestamp")
  private Long datasetTs;

  @Convert(converter = PostgresTimestampConverter.class)
  @Column(name = "modified_ts")
  Long modifiedTs; // last modified time of bin file

  @Convert(converter = PostgresTimestampConverter.class)
  @Column(name = "event_ts")
  Long eventTs; // when CloudTrail event was generated

  @Convert(converter = PostgresTimestampConverter.class)
  @Column(name = "ingest_start_ts")
  Long ingestStartTs;

  @Convert(converter = PostgresTimestampConverter.class)
  @Column(name = "ingest_timestamp")
  Long ingestEndTs;
}

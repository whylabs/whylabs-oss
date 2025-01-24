package ai.whylabs.dataservice.structures;

import ai.whylabs.core.enums.PostgresBulkIngestionMode;
import ai.whylabs.core.utils.PostgresTimestampConverter;
import ai.whylabs.dataservice.enums.BulkLoadStatus;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import io.micronaut.core.annotation.Introspected;
import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity(name = "bulk_load_audit")
@Table(name = "whylabs.bulk_load_audit")
@Introspected
@TypeDef(name = "bulk_load_mode_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "bulk_load_status_enum", typeClass = PostgreSQLEnumType.class)
public class BulkLoadAuditEntry {
  @Id
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String id;

  @Column(name = "load_start")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long start;

  @Column(name = "load_end")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long end;

  @Enumerated(EnumType.STRING)
  @Type(type = "bulk_load_status_enum")
  private BulkLoadStatus status;

  @Column(name = "load_table")
  private String table;

  @Enumerated(EnumType.STRING)
  @Column(name = "load_mode")
  @Type(type = "bulk_load_mode_enum")
  private PostgresBulkIngestionMode mode;
}

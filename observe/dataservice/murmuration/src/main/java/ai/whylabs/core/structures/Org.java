package ai.whylabs.core.structures;

import ai.whylabs.core.enums.IngestionRollupGranularity;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import io.micronaut.core.annotation.Introspected;
import javax.persistence.*;
import lombok.Data;
import lombok.experimental.FieldNameConstants;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@Data
@Entity(name = "org")
@Table(name = "whylabs.orgs")
@Introspected
@TypeDef(name = "ingestion_rollup_granularity_enum", typeClass = PostgreSQLEnumType.class)
@FieldNameConstants
public class Org {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  private String orgId;
  private Integer dataRetentionDays;
  private Boolean enableGranularDataStorage = false;

  @Column(columnDefinition = "ingestion_granularity")
  @Enumerated(EnumType.STRING)
  @Type(type = "ingestion_rollup_granularity_enum")
  private IngestionRollupGranularity ingestionGranularity = IngestionRollupGranularity.hourly;
}

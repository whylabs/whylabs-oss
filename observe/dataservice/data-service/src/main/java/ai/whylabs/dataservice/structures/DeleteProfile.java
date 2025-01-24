package ai.whylabs.dataservice.structures;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import ai.whylabs.dataservice.enums.DeletionStatus;
import ai.whylabs.dataservice.requests.DeleteProfileRequest;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import io.micronaut.core.annotation.Introspected;
import javax.persistence.Column;
import javax.persistence.Convert;
import javax.persistence.Embedded;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
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
@Entity(name = "profile_deletions")
@Table(name = "whylabs.profile_deletions")
@Introspected
@TypeDef(name = "deletion_status_enum", typeClass = PostgreSQLEnumType.class)
public class DeleteProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "status")
  @Type(type = "deletion_status_enum")
  private DeletionStatus status;

  @Convert(converter = PostgresTimestampConverter.class)
  private Long creationTimestamp;

  @Convert(converter = PostgresTimestampConverter.class)
  private Long updatedTimestamp;

  @JsonUnwrapped @Embedded private DeleteProfileRequest request;
}

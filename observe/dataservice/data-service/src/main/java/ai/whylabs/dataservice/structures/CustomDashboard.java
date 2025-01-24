package ai.whylabs.dataservice.structures;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.micronaut.core.annotation.Introspected;
import io.swagger.v3.oas.annotations.media.Schema;
import javax.persistence.*;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity(name = "custom_dashboards")
@Table(name = "whylabs.custom_dashboards")
@Introspected
public class CustomDashboard {

  @Id
  @Schema(required = true)
  private String id;

  @JsonPropertyDescription("The organization that own the dashboard")
  @Schema(required = true)
  private String orgId;

  @JsonPropertyDescription("The user who created the dashboard")
  @Schema(required = false)
  private String author;

  @JsonPropertyDescription("The friendly dashboard's name")
  @Schema(required = true)
  private String displayName;

  @JsonPropertyDescription("The object that has the dashboard config")
  @Schema(required = true)
  private String schema;

  @JsonPropertyDescription("Flag to mark dashboard as favorite")
  @Schema(required = false)
  private Boolean isFavorite;

  @JsonPropertyDescription("Timestamp of creation, automatically handled")
  @Schema(required = false)
  @Convert(converter = PostgresTimestampConverter.class)
  private Long creationTimestamp;

  @JsonPropertyDescription("Timestamp of lat update, automatically handled")
  @Schema(required = false)
  @Convert(converter = PostgresTimestampConverter.class)
  private Long lastUpdatedTimestamp;

  @JsonPropertyDescription("Timestamp of deletion. Should be null while the dashboard is active")
  @Schema(required = false)
  @Convert(converter = PostgresTimestampConverter.class)
  private Long deletedTimestamp;
}

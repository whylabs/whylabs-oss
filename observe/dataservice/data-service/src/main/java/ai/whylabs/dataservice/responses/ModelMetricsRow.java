package ai.whylabs.dataservice.responses;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.core.annotation.Nullable;
import javax.persistence.*;
import lombok.Data;

@Data
@Entity(name = "model_metric_row")
@Introspected
public class ModelMetricsRow {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(name = "timestamp")
  private Long timestamp;

  @Column(name = "tag")
  @Nullable
  private String segmentKeyValue;

  @JsonPropertyDescription("Unix ts in millis indicating when this record was updated")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long lastUploadTs;

  @Nullable private byte[] metrics;

  public Object getGroupBy() {
    return segmentKeyValue != null ? segmentKeyValue : timestamp;
  }
}

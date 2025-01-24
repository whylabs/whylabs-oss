package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import io.micronaut.core.annotation.Introspected;
import java.io.Serializable;
import javax.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder()
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity(name = "monitor_config")
@Table(name = "whylabs.monitor_config")
@Introspected
public class MonitorConfigV3Row implements Serializable {
  @Id private String id;
  private String orgId;
  private String datasetId;

  @Convert(converter = PostgresTimestampConverter.class)
  private Long updatedTs;

  /**
   * Basically the updatedTs rolled up to the hour. A corresponding bin gets generated on the
   * profiles so that we can perform an equi-join rather than a range based non-equi join which is
   * really inefficient in spark.
   */
  @Transient private Long bin;

  /**
   * We learned the hard way with monitor V2 that the deltalake project hasn't worked out all the
   * kinks with deeply nested datastructures yet so it works out better storing the json as a blob
   * and turning it into a legit structure at read time
   */
  private String jsonConf;
}

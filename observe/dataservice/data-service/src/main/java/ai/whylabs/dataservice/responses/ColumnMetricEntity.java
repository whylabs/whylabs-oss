package ai.whylabs.dataservice.responses;

import ai.whylabs.core.utils.PostgresTimestampConverter;
import ai.whylabs.dataservice.requests.SegmentTag;
import ai.whylabs.dataservice.util.PostgresSegmentTextConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import io.micronaut.core.annotation.Introspected;
import java.io.Serializable;
import java.util.List;
import javax.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

/**
 * A generic class used to receive raw data from Postgres. Used for a variety of queries that may
 * aggregate results by timestamp or segmentKeyValue (e.g. age=old).
 */
@FieldNameConstants
@Data
@Builder(toBuilder = true)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@ToString
// Micronaut
@Entity(name = "metric_row")
@Introspected
public class ColumnMetricEntity implements Serializable {

  @Id private Integer id;

  @JsonPropertyDescription("Unix ts in millis indicating when this record was created by the job")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long timestamp;

  private String referenceId;

  @Column(name = "tag")
  private String segmentKeyValue;

  private String columnName;
  // TODO: Chris, need your help surfacing private Long profileId;
  private String metricPath;

  private Long longs;
  private Double doubles;
  private String strings;
  private Long profileId;

  @Convert(converter = PostgresSegmentTextConverter.class)
  private List<SegmentTag> segmentText;

  /**
   * helper function for grouping collections of this class. Group by segmentKeyValue if non-null,
   * otherwise by timestamp.
   */
  public Object getGroupBy() {
    return segmentKeyValue != null ? segmentKeyValue : timestamp;
  }

  /** predicate to test if this instance contains any data from postgres. */
  public boolean isEmpty() {
    return longs == null && doubles == null && strings == null;
  }
}

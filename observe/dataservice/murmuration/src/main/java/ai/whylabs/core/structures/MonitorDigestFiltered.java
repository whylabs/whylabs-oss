package ai.whylabs.core.structures;

import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties
@FieldNameConstants
public class MonitorDigestFiltered {
  private String orgId;
  private String datasetId;
  private String monitorId;
  private String monitorJson;
  private AnalyzerResult analyzerResult;
  private Long datasetTimestamp;
  private Long anomalyCount;
  private Integer severity;
  private String segment;
  private String column;
  private String analyzerType;
  private Double weight;
}

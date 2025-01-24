package ai.whylabs.core.structures;

import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.AggregationDataGranularity;
import java.io.Serializable;
import java.util.ArrayList;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ExplodedRow implements Serializable {

  private String segmentText;

  // Top level dimensions
  private String orgId;
  private String columnName;
  // Data timestamp
  private long ts;

  private String datasetId;

  /**
   * When exploding profiles we create 1 extra row as a terminator so that we can do a single pass
   * over sorted data and know that we hit the last record for the org+col+dataset combo
   */
  private Boolean rowTerminator;

  /** Some exploded rows are dataset level like model performance metrics */
  private TargetLevel targetLevel = TargetLevel.column;

  /**
   * Most cases the subPartition will be zero. We subpartition individual profiles to avoid
   * aggregation key hotspots
   */
  private Integer subPartition;

  private AggregationDataGranularity aggregationDataGranularity =
      AggregationDataGranularity.ROLLED_UP;

  // Sketches
  private byte[] histogram;
  private byte[] frequentItems;
  private byte[] uniqueCount;
  private byte[] model_metrics;
  private byte[] variance_tracker;

  // Model metrics
  private byte[] classification;
  private byte[] regression;

  // Simple Metrics
  private Long counters_count;

  private Double number_max;
  private Double number_min;
  private Long schema_count_BOOLEAN;
  private Long schema_count_FRACTIONAL;
  private Long schema_count_INTEGRAL;
  private Long schema_count_NULL;
  private Long schema_count_STRING;
  private Long schema_count_UNKNOWN;

  // Ref profile
  private String profileId;
  // Customer provided trace id for debugging external systems. EG PK in their database
  private String traceId;

  @Builder.Default private Boolean missing = false;
  private Double weight;

  // Operational Metrics
  private Boolean ingestionMetricRow = false;
  private long mostRecentDatalakeWriteTs;
  private Long lastUploadTs;

  // Feedback loop, elements brought from previous monitor runs
  private Boolean feedbackRow = false;
  private String feedbackAnalyzerId;
  private String feedbackAnalysisId;
  private Long feedbackAlertCount;
  private Double feedbackThresholdCalculatedUpper;
  private Double feedbackThresholdCalculatedLower;
  private Double feedbackThresholdAbsoluteUpper;
  private Double feedbackThresholdAbsoluteLower;
  private Double feedbackThresholdMetricValue;

  private Boolean feedbackSeasonalShouldReplace;
  private Double feedbackSeasonalLambdaKeep;
  private Double feedbackSeasonalAdjustedPrediction;
  private Double feedbackSeasonalReplacement;

  private Long monitorConfigBin;

  // Dataset level row fields
  private ArrayList<String> datasetFields = new ArrayList<>();

  // Trace ids
  private ArrayList<String> traceIds = new ArrayList<>();
}

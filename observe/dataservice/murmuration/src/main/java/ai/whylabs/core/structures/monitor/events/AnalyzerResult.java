package ai.whylabs.core.structures.monitor.events;

import ai.whylabs.core.configV3.structure.Analyzers.ColumnListChangeMode;
import ai.whylabs.core.configV3.structure.Analyzers.DiffMode;
import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonOperator;
import ai.whylabs.core.configV3.structure.Analyzers.ThresholdType;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import ai.whylabs.core.enums.ExtendedChronoUnit;
import ai.whylabs.core.utils.Constants;
import ai.whylabs.core.utils.PostgresLongToBooleanConverter;
import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.vladmihalcea.hibernate.type.array.LongArrayType;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import com.vladmihalcea.hibernate.type.json.JsonStringType;
import io.micronaut.core.annotation.Introspected;
import java.io.Serializable;
import java.util.List;
import javax.annotation.Nullable;
import javax.persistence.*;
import lombok.*;
import lombok.experimental.FieldNameConstants;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@FieldNameConstants
@Data
@Builder(toBuilder = true)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PUBLIC)
@ToString
// Micronaut
@Entity(name = "analyzer_result")
@Table(name = "whylabs.whylogs_analyzer_results")
@Introspected
@TypeDef(name = "column_list_mode_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "granularity_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "target_level_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "diff_mode_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "frequent_string_comparison_operator_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "threshold_type_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "json", typeClass = JsonStringType.class)
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@TypeDef(name = "freq_string_count_array", typeClass = LongArrayType.class)

/**
 * The result of analysis modeled how we store in the deltalake. Any new fields should be carried
 * over into AnalyzerResultResponse as well if we want to surface said features in the REST API
 * signature.
 */
public class AnalyzerResult implements Serializable {

  // Represent a specific version of a datapoint (includes runId in the derived UUID)
  @JsonPropertyDescription("UUID/primary key resembling an analysis that was part of a monitor run")
  @Id
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String id;

  // Flag for whether this is the most recent version for this datapoint
  @JsonPropertyDescription(
      "Indicates that across multiple runs of an analysis that this is the most recent one. Note this doesn't flow into druid because druid (at time of writing) druid will only reflect the latest")
  @Transient
  @Nullable
  private Boolean latest;

  @JsonPropertyDescription(
      "UUID resembling a particular analyzer running on a specific point in time. When backfilling/overwriting this ID will be stable across multiple job runs (unlike ID).")
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String analysisId;

  @JsonPropertyDescription("Organization id ")
  private String orgId;

  @JsonPropertyDescription("modelId,entityId => datasetId in the V3 world")
  private String datasetId;

  @JsonPropertyDescription("Column,Feature,Field => column in the V3 world")
  @Column(name = Constants.COLUMN_NAME)
  private String column;

  @JsonPropertyDescription("Granularity of the entity (hourly, daily, etc)")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "granularity")
  @Type(type = "granularity_enum")
  private ExtendedChronoUnit granularity;

  @JsonPropertyDescription(
      "String representation of the segment. This is a comma separated (sorted) list of kv pairs")
  @Deprecated
  /* Segment was initially flattened b/c druid couldn't do maps. Postgres can
  so the plan is to migrate to tags modeled as a map in java, json in postgres */
  private String segment;

  @JsonPropertyDescription("Unix ts in millis indicating when this record was created by the job")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long creationTimestamp;

  @JsonPropertyDescription(
      "Unix ts of the point in time this analysis ran against (the target batch)")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long datasetTimestamp;

  @JsonPropertyDescription("column/dataset level analysis")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "granularity")
  @Type(type = "granularity_enum")
  private TargetLevel targetLevel;

  @JsonPropertyDescription("Zero or 1 to indicate this was an anomaly")
  private Long anomalyCount;

  @JsonPropertyDescription("How many batches in the target range had the metric present")
  private Long targetCount;

  @JsonPropertyDescription("How many batches in the target range were uploaded")
  private Long targetBatchesWithProfileCount;

  @JsonPropertyDescription(
      "How many batches in the baseline had the metric present. Suppose you're monitoring "
          + "on your f1 performance score with a 7d trailing baseline. targetBatchesWithProfileCount=7 would indicate"
          + "there are 7 profiles uploaded for the 7 trailing batches while baselineCount=2 would indicate"
          + "that two out of the 7 actually had a model performance metric logged")
  private Long baselineCount;

  @JsonPropertyDescription("How many batches in the baseline were uploaded")
  private Long baselineBatchesWithProfileCount;

  @JsonPropertyDescription(
      "How many batches we expect for a 'complete' baseline. For a 7d trailing"
          + "window that would be 7. For a reference profile baseline it would be 1.")
  private Long expectedBaselineCount;

  @JsonPropertyDescription(
      "Out of expectedBaselineDatapointsCount if fewer than expectedBaselineDatapointsSuppressionThreshold are present then suppress the alert. Suppose"
          + "you had a 14d trailing and only 2 datapoints were present, this indicates the minBaseline value"
          + "that specifies how much baseline is required to run the calculation")
  private Long expectedBaselineSuppressionThreshold;

  @JsonPropertyDescription("This analyzer rolls up the baseline as part of its analysis")
  private Boolean isRollup;

  @JsonPropertyDescription("Unique id for an execution of either a monitor batch job or adhoc run")
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String runId;

  @JsonPropertyDescription("The analyzer ID specified by the user")
  private String analyzerId;

  @JsonPropertyDescription("The metric used by this calculation")
  private String metric;

  @JsonPropertyDescription("Nullable, algo used by the metric (hellinger, etc)")
  private String algorithm;

  @JsonPropertyDescription("Required type of analyzer (drift, diff, etc)")
  private String analyzerType;

  @JsonPropertyDescription("The algorithm's mode used by this calculation")
  private String algorithmMode;

  // How long did this calculation take?
  @JsonPropertyDescription(
      "Time in nanoseconds of how long an analysis took to execute. It's typically zero until you get into the python stuff")
  private Long calculationRuntimeNano;

  @JsonPropertyDescription("Version of the analyzer that ran")
  private Long analyzerVersion;

  /**
   * When at the analysis level this indicates which monitors care about that analysis (incase you
   * need an easy way to work backwards up the chain)
   */
  @JsonPropertyDescription(
      "An analyzer can be used by multiple monitors. This is a list of monitorIds "
          + "which did not exclude this particular field")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> monitorIds;

  @JsonPropertyDescription(
      "Monitor analysis may fail for multiple reasons. "
          + "1) Invalid monitor configuration may be detected at the time the configuration is parsed. "
          + "2) Selection or extraction of metric value may fail. "
          + "3) The calculation of monitor threshold may fail, due to inadvertent arithmetic error or "
          + "Incompatibility of expected and actual types. Every effort is made to generate a MonitorEvent even when exceptions are generated.\n"
          + "  If an error is detected, `failuretype` and `failureExplanation` fields will\n"
          + "  provide more information about the failure.")
  private FailureType failureType;

  @JsonPropertyDescription("For internal uses only, this can be a stack trace used for debugging")
  private String failureExplanation;

  /** This field is no longer used */
  @Transient @Deprecated private Long weight;

  @JsonPropertyDescription(
      "Per entity schema the weight of the feature (importance) as registered in the entity schema")
  private Double segmentWeight;

  @JsonPropertyDescription(
      "segmentWeight was provided by customer. This is used to indicate whether 'segmentWeight' being zero is significant")
  @Transient // Not stored in postgres. Only had it b/c of druid zero handling limitations
  @Deprecated
  private Boolean segmentWeightProvided;

  @JsonPropertyDescription("From the analyzer.metadata.version in config the latest config version")
  private Long analyzerConfigVersion;

  /**
   * Monitor level events private String monitorId;
   *
   * <p>private List<String> sources; private Long sourcesCount; private List<String>
   * sourceTargetAnomalyIds; private Long sourceTargetAnomalyCount; private List<String>
   * sourceMetrics; private List<String> sourceTargetNames; private List<String> sourceDatasetIds;
   * private List<String> sourceSegmentTexts; private Long severity;
   */

  /**
   * How recent of a dataset timestamp have they used? A large spread between
   * mostRecentDatasetDatalakeWriteTs and mostRecentDatasetTs can indicate an issue. EG if it's
   * 2021-1970 we know they're using zeros for dataset timestamps.
   */
  // TODO: Keep?
  // private Long mostRecentDatasetTs;

  /**
   * ********* NAMESPACED VALUES & DIMENSIONS (different analyzers produce different flavors of
   * output so we namespace. *********
   */

  /** ********* Threshold ************* */
  @JsonPropertyDescription(
      "Value of baseline metric (if applicable, arima for example produces a range rather than single value)")
  private Double threshold_baselineMetricValue;

  @JsonPropertyDescription(
      "Value of target metric (if applicable, arima for example produces a range rather than single value)")
  private Double threshold_metricValue;

  @JsonPropertyDescription(
      "Calculations like ARIMA produce a range which we expect the target to fall within")
  private Double threshold_calculatedUpper;

  @JsonPropertyDescription(
      "Calculations like ARIMA produce a range which we expect the target to fall within")
  private Double threshold_calculatedLower;

  @JsonPropertyDescription("User supplied max upper value")
  private Double threshold_absoluteUpper;

  @JsonPropertyDescription("User supplied min lower value")
  private Double threshold_absoluteLower;

  @JsonPropertyDescription("When doing stddev, the factor")
  private Double threshold_factor;

  @JsonPropertyDescription("Minimum number of batches present for this calculation to run")
  private Integer threshold_minBatchSize;

  /** ********* Seasonal ************* */
  @JsonPropertyDescription("Seasonal algorithm: should this value be replaced or not")
  private Boolean seasonal_shouldReplace;

  @JsonPropertyDescription(
      "Seasonal lambda keep: This parameter controls a weighted average between"
          + " the customer supplied value and the adjusted prediction after we've decided to adjust the"
          + " prediction. In the extremes, lambda_keep=1.0 means always use the customer data and "
          + "lambda_keep=0.0 means always use the adjusted prediction")
  private Double seasonal_lambdaKeep;

  @JsonPropertyDescription(
      "Seasonal adjusted value: we add some randomness in a Gaussian distribution"
          + "and then multiply it by the stddev to calculate this value (we don't want to use the"
          + "prediction directly since ARIMA will collapse on the confidence interval)")
  private Double seasonal_adjusted_prediction;

  @JsonPropertyDescription(
      "ARIMA replacement value after applying the above lambda keep and adjusted" + "predictions")
  private Double seasonal_replacement;

  /** ******* Column List Change ************* */
  @JsonPropertyDescription("How many schema columns were added")
  private Long columnList_added;

  @JsonPropertyDescription("How many schema columns were removed")
  private Long columnList_removed;

  @JsonPropertyDescription("A small sample of added columns")
  @Type(type = "com.vladmihalcea.hibernate.type.array.StringArrayType")
  private List<String> columnList_addedSample;

  @Type(type = "com.vladmihalcea.hibernate.type.array.StringArrayType")
  @JsonPropertyDescription("A small sample of removed columns")
  private List<String> columnList_removedSample;

  @JsonPropertyDescription("Alert based on adding new columns, removing columns, or both")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "column_list_mode")
  @Type(type = "column_list_mode_enum")
  private ColumnListChangeMode columnList_mode;

  // TODO: Do we want this?
  // @JsonPropertyDescription("User supplied list of columns to exclude")
  // private List<String> columnList_exclude;

  /** ***** Comparison ************* */
  @JsonPropertyDescription("Baseline value if comparing against baseline in an equality monitor")
  private String comparison_expected;

  @JsonPropertyDescription("Target value in an equality monitor")
  private String comparison_observed;

  /** ******* Frequent String Comparison */
  @JsonPropertyDescription("Type of frequent string item comparison")
  @Enumerated(EnumType.STRING)
  @Type(type = "frequent_string_comparison_operator_enum")
  @Column(columnDefinition = "frequent_String_comparison_operator")
  private FrequentStringComparisonOperator frequentStringComparison_operator;

  @JsonPropertyDescription("A small sample on the difference of items")
  @Type(type = "com.vladmihalcea.hibernate.type.array.StringArrayType")
  @Column(columnDefinition = "frequent_string_comparison_sample")
  private List<String> frequentStringComparison_sample;

  @JsonPropertyDescription("estimated counts for each of the samples")
  @Type(type = "com.vladmihalcea.hibernate.type.json.JsonType")
  @Column(name = "frequent_string_sample_count", columnDefinition = "jsonb")
  private List<Long[]> freqStringCount;

  /** ****** Drift ************** */
  @JsonPropertyDescription("How much drift?")
  private Double drift_metricValue;

  @JsonPropertyDescription("Anomaly threshold?")
  private Double drift_threshold;

  /** ****** Diff ************** */
  @JsonPropertyDescription("How much difference?")
  private Double diff_metricValue;

  @JsonPropertyDescription("Anomaly threshold")
  private Double diff_threshold;

  @JsonPropertyDescription("Mode (pct/absolute)")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "diff_mode")
  @Type(type = "diff_mode_enum")
  private DiffMode diff_mode;

  @JsonPropertyDescription("Threshold type (upper/lower)")
  @Enumerated(EnumType.STRING)
  @Column(columnDefinition = "threshold_type")
  @Type(type = "threshold_type_enum")
  private ThresholdType threshold_type;

  @JsonPropertyDescription("Version of the entity schema that was present")
  private Long entitySchemaVersion;

  @JsonPropertyDescription("File path to an embeddable image if it was rendered")
  private String imagePath;

  @JsonPropertyDescription(
      "What type of output did this analyzer produce. Values mirror the class used in murmuration's ai.whylabs.core.calculationsV3.results package")
  private String analyzerResultType;

  @JsonPropertyDescription(
      "Indicates that analysis was ran due to either a user initiated backfill or a job level overrideEvents")
  @Convert(converter = PostgresLongToBooleanConverter.class)
  private Long userInitiatedBackfill;

  @JsonPropertyDescription("Version of a weight config")
  private Long weightConfigVersion;

  @JsonPropertyDescription("Users may mark an anomaly as unhelpful")
  private Boolean userMarkedUnhelpful;

  /*
  @JsonPropertyDescription("Tags indicating the segment this analysis was for")
  @SuppressWarnings("JpaAttributeTypeInspection")
  @Type(type = "jsonb")
  @Column(columnDefinition = "jsonb")
  private Map<String, String> tags;
  */

  @JsonPropertyDescription(
      "metadata.version pulled from the top level monitor config doc (what songbird uses to version configs)")
  private Long monitorConfigVersion;

  @JsonPropertyDescription("The identifier if a reference profile was used as the baseline")
  private String referenceProfileId;

  @JsonPropertyDescription("Tags on the analyzer config")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> analyzerTags;

  @JsonPropertyDescription(
      "User provided traceId from external system (database PK, image filename, tec). If multiple traceIds were merged, this will be a sample.")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> traceIds;

  @JsonPropertyDescription(
      "Rollup on the target was disabled so this analysis was for an individual profile, not a rolled up batch")
  private Boolean disableTargetRollup = false;

  @JsonPropertyDescription("Tags on the analyzer config")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> childAnalyzerIds;

  @JsonPropertyDescription("Tags on the analyzer config")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  private List<String> childAnalysisIds;

  @JsonPropertyDescription(
      "This analysis was a parent analyzer (composite of multiple child analysis)")
  private Boolean parent = false;

  @JsonPropertyDescription(
      "Internal use only, this is used to help when aggregating to know you're on the last row of the table and must flush any state")
  private Boolean terminalRow = false;

  @JsonPropertyDescription("Internal use only, used for the shuffling of children to parents")
  private Integer rowPartition;

  @JsonPropertyDescription("Internal use only, used deltalake partitioning")
  private String yyyymmdd;

  /**
   * Convert AnalyzerResultResponse (from PG query) to AnalyzerResult.
   *
   * <p>Some external interfaces (e.g. digest notifications) expose AnalyzerResult structures to the
   * customer.
   */
  public static AnalyzerResult to(AnalyzerResultResponse row) {
    val builder =
        AnalyzerResult.builder()
            .orgId(row.getOrgId())
            .datasetId(row.getDatasetId())
            .datasetTimestamp(row.getDatasetTimestamp())
            .monitorIds(row.getMonitorIds())
            .analysisId(row.getAnalysisId())
            .analyzerId(row.getAnalyzerId())
            .column(row.getColumn())
            .segment(row.getSegment())
            .anomalyCount(row.getAnomalyCount())
            .targetLevel(row.getTargetLevel());
    if (row.getThreshold() != null) {
      builder
          .threshold_calculatedLower(row.getThreshold().getThreshold_calculatedLower())
          .threshold_calculatedUpper(row.getThreshold().getThreshold_calculatedUpper())
          .threshold_metricValue(row.getThreshold().getThreshold_metricValue());
    }
    if (row.getSeasonal() != null) {
      builder
          .seasonal_lambdaKeep(row.getSeasonal().getSeasonal_lambdaKeep())
          .seasonal_shouldReplace(row.getSeasonal().getSeasonal_shouldReplace())
          .seasonal_adjusted_prediction(row.getSeasonal().getSeasonal_adjusted_prediction())
          .seasonal_replacement(row.getSeasonal().getSeasonal_replacement());
    }
    return builder.build();
  }
}

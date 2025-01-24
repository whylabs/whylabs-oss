package ai.whylabs.core.structures;

import ai.whylabs.core.enums.MonitorRunStatus;
import ai.whylabs.core.structures.monitor.events.FailureType;
import ai.whylabs.core.utils.PostgresTimestampConverter;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.vladmihalcea.hibernate.type.basic.PostgreSQLEnumType;
import io.micronaut.core.annotation.Introspected;
import java.io.Serializable;
import java.util.List;
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
import lombok.experimental.FieldNameConstants;
import org.hibernate.annotations.Parameter;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

@FieldNameConstants(asEnum = true)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
// Hibernate
@Entity(name = "analyzer_runs")
@Table(name = "whylabs.analyzer_runs")
@Introspected
@TypeDef(name = "monitor_run_status_enum", typeClass = PostgreSQLEnumType.class)
@TypeDef(name = "failure_type_enum", typeClass = PostgreSQLEnumType.class)
public class AnalyzerRun implements Serializable {

  @Id
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String id;

  @JsonPropertyDescription("Organization Id")
  private String orgId;

  @JsonPropertyDescription("Dataset/Entity/Model => Dataset")
  private String datasetId;

  @JsonPropertyDescription("Unix ts in millis indicating when this record was created by the job")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long createdTs;

  @JsonPropertyDescription("Unix ts in millis when this monitor (pipeline) run began")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long startedTs;

  @JsonPropertyDescription("Unix ts in millis when this monitor (pipeline) run ended")
  @Convert(converter = PostgresTimestampConverter.class)
  private Long completedTs;

  @JsonPropertyDescription(
      "Not all monitor runs are successful particularly if the analyzer is missconfigured")
  @Enumerated(EnumType.STRING)
  @Type(type = "monitor_run_status_enum")
  private MonitorRunStatus status;

  @JsonPropertyDescription("Unique id for an execution of either a monitor batch job or adhoc run")
  @Type(type = "ai.whylabs.dataservice.hibernate.WhyPostgresUUIDType")
  private String runId;

  @JsonPropertyDescription(
      "Internal field (could be stack trace) for debugging why a monitor run failed")
  private String internalErrorMessage;

  @JsonPropertyDescription("From monitor config, the user supplied analyzer id")
  private String analyzerId;

  @JsonPropertyDescription(
      "How many batches (per model granularity) in the baseline had profiles uploaded")
  private Long baselineBatchesWithProfileCount;

  @JsonPropertyDescription(
      "How many batches (per model granularity) in the target had profiles uploaded. Currently always 1, but will eventually be >1")
  private Long targetBatchesWithProfileCount;

  @JsonPropertyDescription("How many columns did this analyzer run against")
  private Long columnsAnalyzed;

  @JsonPropertyDescription("How many columns were anomaly")
  private Long anomalies;

  @JsonPropertyDescription(
      "List of failure types that occurred when trying to calculate this anomaly. Can be null or many. Note there can be a mix of successful and failures in a single run.")
  @Column(name = "failure_types", columnDefinition = "text[]")
  @Type(
      type = "ai.whylabs.core.utils.PostgresEnumArrayType",
      parameters = {
        @Parameter(
            name = "enumClass",
            value = "ai.whylabs.core.structures.monitor.events.FailureType")
      })
  private List<FailureType> failureTypes;

  @JsonPropertyDescription(
      "We generally run the latest config, but zero would indicate we did a versioned backfill using baseline configs as they looked based on the dataset timestamp")
  private Boolean forceLatestConfigVersion;

  @JsonPropertyDescription("Version of the analyzer")
  private Long analyzerVersion;

  @JsonPropertyDescription("Monitor IDs that care about this analyzer")
  @Type(type = "com.vladmihalcea.hibernate.type.array.ListArrayType")
  @Enumerated(EnumType.STRING)
  private List<String> monitorIds;

  @JsonPropertyDescription("List of segments analyzed")
  private Long segmentsAnalyzed;

  @JsonPropertyDescription("This monitor run was requested to be a backfill by the customer")
  private Boolean customerRequestedBackfill;

  /** Ideas * */

  // private Long requestedTs;
  // private boolean backfill;
  // private String backfillRequestor;
  // private boolean useLatestConfig;
  // private Integer analysisConfigVersion;
  // private Integer monitorConfigVersion;

}

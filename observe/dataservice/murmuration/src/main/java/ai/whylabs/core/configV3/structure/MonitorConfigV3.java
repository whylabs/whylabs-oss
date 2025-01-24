package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.enums.Granularity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSetter;
import com.fasterxml.jackson.annotation.Nulls;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties

// Single JSON blob per entity
public class MonitorConfigV3 {

  public MonitorConfigV3(MonitorConfigV3 conf) {
    id = conf.getId();
    orgId = conf.getOrgId();
    schemaVersion = conf.getSchemaVersion();
    datasetId = conf.getDatasetId();
    granularity = conf.getGranularity();
    entitySchema = conf.getEntitySchema();
    weightConfig = conf.getWeightConfig();
    analyzers = conf.getAnalyzers();
    allowPartialTargetBatches = conf.isAllowPartialTargetBatches();
    monitors = conf.getMonitors();
    updatedTs = conf.getUpdatedTs();
    metadata = conf.getMetadata();
  }

  private String id;
  private String orgId;
  private Integer schemaVersion = 1;
  private String datasetId; // The unique ID of an entity, e.g. model-5
  private Granularity granularity;
  // Not avail yet in songbird, will add but initial rollout shouldn't expect
  private EntitySchema entitySchema;
  private WeightConfig weightConfig;
  private List<Analyzer> analyzers;

  /**
   * Normally we wait for a target batch to end before running analysis. When enabled a target batch
   * is eligable as soon as data is present, dataReadinessDuration + batchCooldownPeriod conditions
   * have been met.
   */
  private boolean allowPartialTargetBatches = false;

  @JsonSetter(nulls = Nulls.SKIP)
  @Builder.Default
  private List<Monitor> monitors = Collections.emptyList(); // optional

  // NB not part of the JSON config;
  // extracted from modified time of S3 object holding config.
  private Long updatedTs;

  @JsonSetter(nulls = Nulls.SKIP)
  private Metadata metadata;

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    MonitorConfigV3 that = (MonitorConfigV3) o;
    return Objects.equals(id, that.id)
        && Objects.equals(orgId, that.orgId)
        && Objects.equals(updatedTs, that.updatedTs)
        && Objects.equals(schemaVersion, that.schemaVersion)
        && Objects.equals(datasetId, that.datasetId)
        && granularity == that.granularity
        && Objects.equals(entitySchema, that.entitySchema)
        && Objects.equals(analyzers, that.analyzers)
        && Objects.equals(monitors, that.monitors);
  }

  @Override
  public int hashCode() {
    return Objects.hash(
        id,
        orgId,
        updatedTs,
        schemaVersion,
        datasetId,
        granularity,
        entitySchema,
        analyzers,
        monitors);
  }
}

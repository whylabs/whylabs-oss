package ai.whylabs.core.configV3.structure;

import ai.whylabs.core.configV3.structure.Analyzers.AnalyzerConfig;
import ai.whylabs.core.configV3.structure.Baselines.Baseline;
import ai.whylabs.core.configV3.structure.enums.TargetLevel;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.Duration;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Builder
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Analyzer {
  private Metadata metadata;
  private String id;
  private AnalyzerSchedule schedule;
  private Boolean disabled;

  @JsonInclude(Include.NON_NULL)
  private TargetMatrix targetMatrix;

  /**
   * Yes you can tag analyzers. EG llm_security. These work more like twitter hashtags than
   * segmentation
   */
  @JsonInclude(Include.NON_NULL)
  private List<String> tags;

  /**
   * ISO 8610 duration format. How far the monitor should wait to generate events once the data
   * arrives. We support 48 hours for houlry data,30 days for daily data, and 6 months for monthly
   * data..
   */
  private Duration backfillGracePeriodDuration;

  /** Hold off on any calculations if they've received an upload within this duration */
  private Duration batchCoolDownPeriod;

  /**
   * ISO 8610 duration format. The duration determines how fast data is ready for the monitor. For
   * example, if your pipeline takes 2 days to deliver profiles to WhyLabs, the value should beP2D.
   */
  private Duration dataReadinessDuration;

  /**
   * In some datasets a single batch target is too granular and produces noisy alerts so we provide
   * the option to extend the target by a number of buckets.
   */
  @JsonInclude(Include.NON_NULL)
  private Integer targetSize = 1;

  /**
   * Normally if a dataset was hourly we'd roll up all data uploaded for that hour and evaluate a
   * single datapoint. We can disable that target rollup to evaluate each datapoint individually in
   * the case of granular storage. This enables workflows that produce analysis for each profile
   * uploaded.
   */
  private boolean disableTargetRollup = false;

  // Each monitor run is associated with the latest hourly/daily
  // dataset timestamp. This offset indicates that we should use the use this value to calculate the
  // target batch.
  @JsonInclude(Include.NON_NULL)
  private AnalyzerConfig config;

  private Long version;

  @JsonIgnore
  public Baseline getBaseline() {
    return config != null ? config.getBaseline() : null;
  }

  @JsonIgnore
  public String getMetric() {
    return config != null ? config.getMetric() : null;
  }

  @JsonIgnore
  public TargetMatrix getTarget() {
    return targetMatrix;
  }

  @JsonIgnore
  public TargetLevel getLevel() {
    return targetMatrix != null ? targetMatrix.getLevel() : null;
  }
}

package ai.whylabs.adhoc.structures;

import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.Tag;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.experimental.FieldNameConstants;

@Getter
@Setter
@FieldNameConstants
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AdHocMonitorRequestV3 {

  @Deprecated protected String columnName;

  /**
   * Indicate which columns to target for this adhoc request. Why do we have these here in addition
   * to the analyzer config? An analyzer could target thousands of columns which is too much data
   * for an adhoc request. The idea is to take a monitor config unchanged from how its stored and
   * use this as an additional filter scoping the adhoc request down to a limited set of columns.
   */
  protected List<String> columnNames;

  /**
   * Indicate which segments to target for this adhoc request. Why do we have these here in addition
   * to the analyzer config? An analyzer could target hundreds of segments which is too much data
   * for an adhoc request. The idea is to take a monitor config unchanged from how its stored and
   * use this as an additional filter scoping the adhoc request down to a limited set of segments.
   */
  protected List<List<Tag>> segmentTags;

  /** Namespace is templated to indicate which druid table to resolve profiles from */
  protected String datasourceNamespace;

  /** The kinesis topic that we sink results to for druid ingestion */
  protected String mutableEventStream;

  // 2021-11-11T00:00:00.000Z"
  protected String start;

  // 2021-11-11T00:00:00.000Z"
  protected String end;

  /**
   * Skip the druid sink and return the results in the response payload turning this adhoc request
   * into a blocking call. This is useful for debugging but could also potentially be used by the
   * backend to shave some response time off of adhoc requests by not having to publish data over
   * kinesis.
   */
  protected Boolean inlineResults = false;

  /** Required: In V3 a monitor config indicates which analyzers to run and how to run them */
  protected MonitorConfigV3 monitorConfig;

  /** Publish results of the adhoc request over SQS to notify siren */
  protected Boolean notifySiren = false;

  /**
   * If you just want to test a notification integration it could be a hangup that the analyzers as
   * configured don't currently have any anomalies. With this mode enabled we'll skip the
   * anomaly=true filter and publish everything even if it's not an anomaly.
   */
  protected Boolean notifySirenEveryAnalysis;

  /** SQS queue to sink json payloads to for siren */
  protected String nearRealTimeAlertSqsQueue;

  protected Boolean enableDatasetLevelAnalysis = false;

  /**
   * In a normal monitor run you would only hit targets that fall within the
   * backfillGracePeriodDuration and skip everything else. You can choose whether or not to ignore
   * those settings with this flag.
   */
  protected Boolean ignoreBackfillGracePeriodLimit = true;
}

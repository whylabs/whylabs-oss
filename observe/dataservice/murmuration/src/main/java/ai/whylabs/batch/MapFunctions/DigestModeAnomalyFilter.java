package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.configV3.structure.Monitor;
import ai.whylabs.core.predicatesV3.inclusion.AnomalyFilterPredicate;
import ai.whylabs.core.predicatesV3.siren.DigestApplicablePredicate;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.MonitorDigest;
import ai.whylabs.core.structures.MonitorDigestFiltered;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;
import scala.Tuple2;

/**
 * For each digest apply the DigestMode.creationTimeOffset and DigestMode.datasetTimestampOffset
 * filters to the analyzer results scoping it down to what would be included in said digest.
 */
@AllArgsConstructor
public class DigestModeAnomalyFilter
    implements FlatMapFunction<Tuple2<MonitorDigest, AnalyzerResult>, MonitorDigestFiltered> {
  public static final int DEFAULT_SEVERITY = 3;

  private ZonedDateTime currentTime;
  private String runId;

  @Override
  public Iterator<MonitorDigestFiltered> call(Tuple2<MonitorDigest, AnalyzerResult> tuple)
      throws Exception {
    MonitorDigest digest = tuple._1;
    AnalyzerResult analyzerResult = tuple._2;
    Optional<MonitorDigestFiltered> r = call(digest, analyzerResult);
    if (r.isPresent()) {
      return Arrays.asList(r.get()).iterator();
    } else {
      return Collections.emptyIterator();
    }
  }

  public Optional<MonitorDigestFiltered> call(MonitorDigest digest, AnalyzerResult analyzerResult)
      throws Exception {

    Monitor monitor = MonitorConfigV3JsonSerde.parseMonitor(digest.getMonitorJson());
    val b =
        MonitorDigestFiltered.builder()
            .monitorId(monitor.getId())
            .orgId(digest.getOrgId())
            .datasetId(digest.getDatasetId())
            .monitorJson(digest.getMonitorJson())
            .datasetTimestamp(analyzerResult.getDatasetTimestamp())
            .analyzerResult(analyzerResult)
            .severity(digest.getSeverity())
            .segment(analyzerResult.getSegment())
            .analyzerType(analyzerResult.getAnalyzerType())
            .column(analyzerResult.getColumn())
            .weight(analyzerResult.getSegmentWeight())
            .anomalyCount(analyzerResult.getAnomalyCount());

    // Filter out anomalies based on the time offsets
    val digestEligablePredicate = new DigestApplicablePredicate(currentTime, runId);

    if (!digestEligablePredicate.test(monitor, analyzerResult)) {
      return Optional.empty();
    }

    val anomalyFilterPredicate = new AnomalyFilterPredicate();
    if (!anomalyFilterPredicate.test(monitor, analyzerResult)) {
      return Optional.empty();
    }

    // TODO: Additional escapes for other filters
    // https://gitlab.com/whylabs/core/monitor-schema/-/blob/main/schema/schema.yaml#L605
    return Optional.of(b.build());
  }
}

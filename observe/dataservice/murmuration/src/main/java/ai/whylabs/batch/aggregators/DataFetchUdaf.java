package ai.whylabs.batch.aggregators;

import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.structures.*;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.Data;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.codehaus.jackson.map.ObjectMapper;

/**
 * Debug use only. This udaf aggregates and throws an exception with a bunch of debug info attached.
 */
@Slf4j
public class DataFetchUdaf extends AnalysisUdaf {
  String metricOfInterest;

  public DataFetchUdaf(
      ZonedDateTime currentTime,
      String runId,
      boolean overwriteEvents,
      String embedableImageBasePath,
      String configRepo,
      String metricOfInterest) {
    super(currentTime, runId, overwriteEvents, embedableImageBasePath, configRepo);
    this.metricOfInterest = metricOfInterest;
  }

  @Data
  public class DiagOutput {
    private Object target;
    private long rowsSeen;
    private String segment;
    private Map<Long, Object> baseline = new HashMap();
  }

  @SneakyThrows
  protected List<AnalyzerResult> dump(AnalysisBuffer buffer) {
    if (buffer.getCollectors().size() == 0) {
      return new ArrayList<>();
    }

    val conf =
        getRepo()
            .get(
                buffer.getCollectors().get(0).getOrgId(),
                buffer.getCollectors().get(0).getDatasetId());

    if (conf == null) {
      return new ArrayList<>();
    }

    val metric = AnalysisMetric.fromName(metricOfInterest);

    DiagOutput out = new DiagOutput();

    int nonNullValues = 0;
    for (val c : buffer.getCollectors()) {
      if (c.getRowsSeen() > 10) {
        long lastTarget = 0l;
        for (val l : c.getTargetBuckets().keySet()) {
          lastTarget = Math.max(lastTarget, l);
        }
        if (lastTarget == 0l) {
          return new ArrayList<>();
        }
        out.rowsSeen = c.getRowsSeen();
        out.segment = c.getSegmentText();

        val target =
            metric.apply(
                new QueryResultStructure(
                    c.getTarget(lastTarget), currentTime.toInstant().toEpochMilli()),
                currentTime);
        if (target == null) {
          return new ArrayList<>();
        }
        out.setTarget(target);
        for (val b : c.getBaselineBuckets(lastTarget).entrySet()) {
          val m = metric.apply(new QueryResultStructure(b.getValue(), null), currentTime);
          out.getBaseline().put(b.getKey(), m);
          nonNullValues += c.getRowsSeen();
        }
      }
    }
    val om = new ObjectMapper();
    if (nonNullValues > 0) {
      throw new RuntimeException(om.writeValueAsString(out));
    }
    return new ArrayList<>();
  }

  @Override
  public AnalysisOutputBuffer finish(AnalysisBuffer buffer) {
    return new AnalysisOutputBuffer(dump(buffer));
  }
}

package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.aggregation.AnalyzerResultsToSirenEveryAnomalyPayload;
import ai.whylabs.core.configV3.structure.MonitorConfigV3Row;
import ai.whylabs.core.serde.MonitorConfigV3JsonSerde;
import ai.whylabs.core.structures.SirenEveryAnomalyPayload;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.Iterator;
import lombok.AllArgsConstructor;
import lombok.val;
import org.apache.spark.api.java.function.FlatMapFunction;
import scala.Tuple2;

@AllArgsConstructor
public class EveryAnomalyModeFilter
    implements FlatMapFunction<
        Tuple2<AnalyzerResult, MonitorConfigV3Row>, SirenEveryAnomalyPayload> {
  private String runId;

  @Override
  public Iterator<SirenEveryAnomalyPayload> call(Tuple2<AnalyzerResult, MonitorConfigV3Row> tuple)
      throws Exception {
    val analyzerResult = tuple._1;
    val monitorConfigV3 = MonitorConfigV3JsonSerde.parseMonitorConfigV3(tuple._2);
    val payloads =
        AnalyzerResultsToSirenEveryAnomalyPayload.to(analyzerResult, monitorConfigV3, runId);
    return payloads.iterator();
  }
}

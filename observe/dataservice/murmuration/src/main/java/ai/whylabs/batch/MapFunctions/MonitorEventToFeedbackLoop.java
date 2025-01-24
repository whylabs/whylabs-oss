package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.aggregation.AnalyzerResultToExplodedRow;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.util.Arrays;
import java.util.Iterator;
import org.apache.spark.api.java.function.FlatMapFunction;

public class MonitorEventToFeedbackLoop implements FlatMapFunction<AnalyzerResult, ExplodedRow> {

  @Override
  public Iterator<ExplodedRow> call(AnalyzerResult analyzerResult) throws Exception {
    ExplodedRow explodedRow = AnalyzerResultToExplodedRow.to(analyzerResult);
    return Arrays.asList(explodedRow).iterator();
  }
}

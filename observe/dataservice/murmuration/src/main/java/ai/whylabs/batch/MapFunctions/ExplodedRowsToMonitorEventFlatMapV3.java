package ai.whylabs.batch.MapFunctions;

import ai.whylabs.core.aggregation.ExplodedRowsToAnalyzerResultsV3;
import ai.whylabs.core.factories.CalculationFactory;
import ai.whylabs.core.structures.BackfillAnalyzerRequest;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.io.Serializable;
import java.time.ZonedDateTime;
import java.util.Iterator;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.api.java.function.FlatMapFunction;

/** Spark API specific wrapper around ExplodedRowsToMonitorMetricsV3 */
@Slf4j
public class ExplodedRowsToMonitorEventFlatMapV3
    implements FlatMapFunction<ExplodedRow, AnalyzerResult>, Serializable {

  private ZonedDateTime currentTime;
  private String druidQuery;
  private String runId;
  private boolean overwriteEvents;
  private ExplodedRowsToAnalyzerResultsV3 explodedRowsToMonitorMetrics;
  private String embedableImageBasePath;
  private List<BackfillAnalyzerRequest> analyzerBackfillRequests;

  public ExplodedRowsToMonitorEventFlatMapV3(
      ZonedDateTime currentTime,
      String druidQuery,
      String runId,
      boolean overwriteEvents,
      String embedableImageBasePath,
      List<BackfillAnalyzerRequest> analyzerBackfillRequests) {
    this.currentTime = currentTime;
    this.druidQuery = druidQuery;
    this.runId = runId;
    this.overwriteEvents = overwriteEvents;
    this.embedableImageBasePath = embedableImageBasePath;
    this.analyzerBackfillRequests = analyzerBackfillRequests;
  }

  @Override
  public Iterator<AnalyzerResult> call(ExplodedRow explodedRow) throws Exception {
    if (explodedRowsToMonitorMetrics == null) {
      explodedRowsToMonitorMetrics =
          new ExplodedRowsToAnalyzerResultsV3(
              currentTime,
              runId,
              overwriteEvents,
              embedableImageBasePath,
              new CalculationFactory(),
              0l);
    }

    return explodedRowsToMonitorMetrics.call(explodedRow);
  }
}

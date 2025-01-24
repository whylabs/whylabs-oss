package ai.whylabs.core.aggregation;

import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

/**
 * Not all calculations require a rolled up baseline. Rolling up a baseline requires a lot of CPU to
 * merge records, so this class exists to make that computation lazy until its needed.
 */
@Slf4j
public class BaselineRoller {
  private QueryResultStructure baselineAllRollup = null;
  private ExplodedRowMerge explodedRowMerge;
  private Map<Long, ExplodedRow> baselineExplodedRows;

  public BaselineRoller(
      Map<Long, ExplodedRow> baselineExplodedRows, ExplodedRowMerge explodedRowMerge) {
    this.baselineExplodedRows = baselineExplodedRows;
    this.explodedRowMerge = explodedRowMerge;
  }

  public BaselineRoller(QueryResultStructure rolledUp) {
    this.baselineAllRollup = rolledUp;
  }

  public boolean hasBaseline() {
    return baselineExplodedRows.size() > 0;
  }

  @SneakyThrows
  public QueryResultStructure get() {
    if (baselineAllRollup == null) {
      ExplodedRow mergedBaseline = null;
      try {
        mergedBaseline = explodedRowMerge.merge(baselineExplodedRows.values());
      } catch (Exception e) {
        // Do not let malformed user data blow up the whole job,
        // in particular merge on malformed sketches.
        log.error(
            "ExplodedRowsToAnalyzerResultsV3.merge failed - {}\nExplodedRowsToAnalyzerResultsV3.merge {}/{} columnName={}",
            e);
        return baselineAllRollup;
      }

      if (mergedBaseline != null && !mergedBaseline.getMissing()) {
        baselineAllRollup = new QueryResultStructure(mergedBaseline, null);
      }
    }
    return baselineAllRollup;
  }
}

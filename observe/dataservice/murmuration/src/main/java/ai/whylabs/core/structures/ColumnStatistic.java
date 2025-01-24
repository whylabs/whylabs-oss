package ai.whylabs.core.structures;

import java.io.Serializable;
import java.util.Collection;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldNameConstants;
import lombok.val;

@FieldNameConstants
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColumnStatistic implements Serializable {
  private Long numAnomalies;
  private String column;
  private String analyzerType;
  private Long oldestAnomalyDatasetTimestamp;
  private Long earliestAnomalyDatasetTimestamp;

  /**
   * Outside a spark context adhoc needs a couple methods that do the aggregation
   *
   * @param stats
   * @return
   */
  public static ColumnStatistic merge(Collection<ColumnStatistic> stats) {
    ColumnStatistic columnStatistic = null;
    for (val cs : stats) {
      if (columnStatistic == null) {
        columnStatistic = cs;
      } else {
        columnStatistic.merge(cs);
      }
    }

    return columnStatistic;
  }

  private void merge(ColumnStatistic ss) {
    numAnomalies = numAnomalies + ss.numAnomalies;
    oldestAnomalyDatasetTimestamp =
        Math.max(oldestAnomalyDatasetTimestamp, ss.oldestAnomalyDatasetTimestamp);
    earliestAnomalyDatasetTimestamp =
        Math.min(earliestAnomalyDatasetTimestamp, ss.earliestAnomalyDatasetTimestamp);
  }
}

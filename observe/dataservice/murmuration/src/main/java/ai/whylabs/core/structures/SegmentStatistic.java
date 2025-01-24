package ai.whylabs.core.structures;

import java.io.Serializable;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
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
public class SegmentStatistic implements Serializable {
  private Long numAnomalies;
  private String segment;
  private String analyzerType;
  private List<String> columns;
  private Long oldestAnomalyDatasetTimestamp;
  private Long earliestAnomalyDatasetTimestamp;

  /**
   * Outside a spark context adhoc needs a couple methods that do the aggregation
   *
   * @param stats
   * @return
   */
  public static SegmentStatistic merge(Collection<SegmentStatistic> stats) {
    SegmentStatistic segmentStatistic = null;
    for (val ss : stats) {
      if (segmentStatistic == null) {
        segmentStatistic = ss;
      } else {
        segmentStatistic.merge(ss);
      }
    }

    return segmentStatistic;
  }

  private void merge(SegmentStatistic ss) {
    numAnomalies = numAnomalies + ss.numAnomalies;
    Set<String> combinedColumns = new HashSet<>();
    combinedColumns.addAll(columns);
    combinedColumns.addAll(ss.getColumns());
    columns = combinedColumns.stream().collect(Collectors.toList());
    oldestAnomalyDatasetTimestamp =
        Math.max(oldestAnomalyDatasetTimestamp, ss.oldestAnomalyDatasetTimestamp);
    earliestAnomalyDatasetTimestamp =
        Math.min(earliestAnomalyDatasetTimestamp, ss.earliestAnomalyDatasetTimestamp);
  }
}

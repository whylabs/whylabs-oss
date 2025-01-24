package ai.whylabs.core.aggregation;

import static java.util.Objects.nonNull;

import com.whylogs.core.message.MetricComponentMessage;
import lombok.Getter;
import lombok.val;

@Getter
public class VarianceAccumulator {
  private Long count;
  private Double sum; // sample variance * (n-1)
  private Double mean;

  public boolean isComplete() {
    return nonNull(count) && nonNull(sum) && nonNull(mean);
  }

  public void accumulate(String metricPath, MetricComponentMessage metric) {

    if (metric.hasD()) {
      val value = metric.getD();
      // a couple special metric paths go into variance tracker,
      // but are not entered into their own row.
      switch (metricPath) {
        case "distribution/mean":
          mean = value;
          return;
        case "distribution/m2":
          sum = value;
          return;
      }
    }

    if (metric.hasN()) {
      val value = metric.getN();
      // special metric path also goes into variance tracker
      if (metricPath.equals("counts/n")) {
        count = value;
      }
    }
  }
}

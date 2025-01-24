package ai.whylabs.core.calculations.math;

import com.clearspring.analytics.util.Lists;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import lombok.val;
import org.apache.commons.math3.distribution.TDistribution;
import org.apache.commons.math3.exception.MathIllegalArgumentException;
import org.apache.commons.math3.stat.StatUtils;

public class GrubbTest {
  /** default significance level */
  public static final double DEFAULT_SIGNIFICANCE_LEVEL = 0.95;

  public static List<Double> filter(List<Double> values) {
    return filter(values, DEFAULT_SIGNIFICANCE_LEVEL);
  }

  public static List<Double> filter(List<Double> values, double significanceLevel) {
    val result = Lists.<Double>newArrayList();
    result.addAll(values);
    while (true) {
      val outlier = getOutlier(result, significanceLevel);
      if (outlier == null) {
        return result;
      }
      result.removeIf((value) -> (Objects.equals(value, outlier)));
    }
  }

  /**
   * Returns a statistical outlier with the default significance level (0.95), or null if no such
   * outlier exists..
   */
  public static Double getOutlier(List<Double> values) {
    return getOutlier(values, DEFAULT_SIGNIFICANCE_LEVEL);
  }

  public static Double getOutlier(List<Double> values, double significanceLevel) {
    AtomicReference<Double> outlier = new AtomicReference<>();
    double grubbs = getGrubbsTestStatistic(values, outlier);
    double size = values.size();
    if (size < 3) {
      return null;
    }
    TDistribution t = new TDistribution(size - 2.0);
    try {
      double criticalValue =
          t.inverseCumulativeProbability((1.0 - significanceLevel) / (2.0 * size));
      double criticalValueSquare = criticalValue * criticalValue;
      double grubbsCompareValue =
          ((size - 1) / Math.sqrt(size))
              * Math.sqrt((criticalValueSquare) / (size - 2.0 + criticalValueSquare));
      if (grubbs > grubbsCompareValue) {
        return outlier.get();
      } else {
        return null;
      }
    } catch (MathIllegalArgumentException e) {
      throw new RuntimeException(e);
    }
  }

  public static double getGrubbsTestStatistic(
      List<Double> values, AtomicReference<Double> outlier) {
    double[] array = toArray(values);
    double mean = StatUtils.mean(array);

    double stddev = stdDev(values);
    double maxDev = 0;
    for (Double value : values) {
      double d = value;
      if (Math.abs(mean - d) > maxDev) {
        maxDev = Math.abs(mean - d);
        outlier.set(value);
      }
    }
    return maxDev / stddev;
  }

  public static Double stdDev(List<?> values) {
    final double variance = StatUtils.variance(toArray(values));
    return Math.sqrt(variance);
  }

  public static double[] toArray(List<?> values) {
    double[] d = new double[values.size()];
    int count = 0;
    for (Object o : values) {
      double val = o instanceof Double ? (Double) o : Double.parseDouble("" + o);
      d[count++] = val;
    }
    return d;
  }
}

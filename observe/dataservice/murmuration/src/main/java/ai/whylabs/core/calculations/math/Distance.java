package ai.whylabs.core.calculations.math;

import ai.whylabs.core.configV3.structure.Analyzers.DriftConfig;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ErrorType;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch.Row;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import java.util.Arrays;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import lombok.val;
import org.apache.commons.lang3.NotImplementedException;

public class Distance {

  public static int N_BINS = 30;
  public static final float EPSILON = 1e-07f;
  public static final double oneOverSqrtTwo = 1 / Math.sqrt(2);

  /**
   * `Hellinger Distance <https://en.wikipedia.org/wiki/Hellinger_distance>`_ Based on,
   * https://github.com/evllabs/JGAAP/blob/master/src/com/jgaap/distances/HellingerDistance.java
   *
   * <p>Hellinger is a symmetric distance measure so it does not matter if `p1` or `p2` is the
   * reference distribution.
   */
  public static double hellingerDistance(double[] p1, double[] p2) {
    double sum = 0.0;
    for (int i = 0; i < p1.length; ++i) {
      sum += Math.pow(Math.sqrt(p2[i]) - Math.sqrt(p1[i]), 2);
    }
    return Math.sqrt(sum) * oneOverSqrtTwo;
  }

  /**
   * Based on Keras' implementation
   * https://github.com/keras-team/keras/blob/be4cef42ab21d85398fb6930ec5419a3de8a7d71/keras/losses.py#L1830
   */
  public static double klDivergence(double[] p1, double[] p2) {
    // TODO: Handling values without support (zero in one of prob distrs),
    // should be undefined.
    double klDiv = 0.0;

    for (int i = 0; i < p1.length; ++i) {
      val v1 = clip(p1[i], EPSILON, 1);
      val v2 = clip(p2[i], EPSILON, 1);

      klDiv += v1 * Math.log(v1 / v2);
    }

    return Math.min(klDiv, Double.MAX_VALUE);
  }

  /**
   * Based on definition (via comparison to KL divergence)
   * https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence#Symmetrised_divergence
   */
  public static double psiMetric(double[] p1, double[] p2) {
    // TODO: Handling values without support (zero in one of prob distrs),
    // should be undefined.
    double psi = 0.0;

    for (int i = 0; i < p1.length; ++i) {
      val v1 = clip(p1[i], EPSILON, 1);
      val v2 = clip(p2[i], EPSILON, 1);

      psi += (v1 - v2) * Math.log(v1 / v2);
    }

    return psi;
  }

  /** caclulate relative entropy. derived from python `scipy.special.rel_entr` */
  static double rel_entr(double x, double y) {
    if (Double.isNaN(x) || Double.isNaN(y)) return Double.NaN;
    else if (x > 0 && y > 0) return x * Math.log(x / y);
    else if (x == 0 && y >= 0) return 0;
    else return Double.POSITIVE_INFINITY;
  }

  /**
   * Based on https://github.com/scipy/scipy/blob/v1.11.0/scipy/spatial/distance.py#L1174-L1259 and
   * https://en.wikipedia.org/wiki/Jensen%E2%80%93Shannon_divergence
   */
  public static double jensenShannonDivergence(double[] p1, double[] p2) {
    double leftKlDiv = 0.0;
    double rightKlDiv = 0.0;

    for (int i = 0; i < p1.length; ++i) {
      val v1 = p1[i];
      val v2 = p2[i];
      val vm = (p1[i] + p2[i]) / 2.0;

      leftKlDiv += rel_entr(v1, vm);
      rightKlDiv += rel_entr(v2, vm);
    }

    double d = Math.sqrt((leftKlDiv + rightKlDiv) / 2.0);
    return Math.min(d, Double.MAX_VALUE);
  }

  public static double clip(double value, double min, double max) {
    if (value > max) {
      return max;
    }
    return Math.max(value, min);
  }

  /*
     Calculate the drift distance between two continuous distributions.
  */
  public static double continuous(
      DriftConfig.Algorithm algorithm, KllDoublesSketch h1, KllDoublesSketch h2) {
    // merge the sketches before calculating bin edges.  use histogram
    // for each distribution using bins from merged sketch.
    val maxValue = Math.max(h1.getMaxValue(), h2.getMaxValue());
    val minValue = Math.min(h1.getMinValue(), h2.getMinValue());
    val binSize = Math.max((maxValue - minValue) / N_BINS, Math.ulp(1.0));
    double[] edges = IntStream.range(0, N_BINS).mapToDouble(i -> minValue + i * binSize).toArray();

    // special case for either sketch being empty,
    if (h1.isEmpty()) {
      return h2.isEmpty() ? 0 : 1;
    } else if (h2.isEmpty()) {
      return h1.isEmpty() ? 0 : 1;
    }

    // special case for min == max
    if (minValue == maxValue) {
      return 0;
    }
    // deal with null PMFs here
    double[] pmf1 = h1.getPMF(edges);
    double[] pmf2 = h2.getPMF(edges);

    if (pmf1 == null) {
      pmf1 = new double[pmf2.length];
      Arrays.fill(pmf1, 0d);
    } else if (pmf2 == null) {
      pmf2 = new double[pmf1.length];
      Arrays.fill(pmf2, 0d);
    }

    switch (algorithm) {
      case hellinger:
        return hellingerDistance(pmf1, pmf2);
      case psi:
        return psiMetric(pmf1, pmf2);
      case jensenshannon:
        return jensenShannonDivergence(pmf1, pmf2);
      case kl_divergence:
        return klDivergence(pmf1, pmf2);
      default:
        throw new NotImplementedException(
            String.format("Unimplemented drift algorithm = \"%s\"", algorithm.name()));
    }
  }

  /*
     Calculate the drift distance between two discrete distributions.
  */
  public static double discrete(
      DriftConfig.Algorithm algorithm, ItemsSketch<String> s1, ItemsSketch<String> s2) {
    // take union of items before calculating pmf.  we want to detect if there is an item missing on
    // one of the distributions.
    val f1 = s1.getFrequentItems(0, ErrorType.NO_FALSE_NEGATIVES);
    val f2 = s2.getFrequentItems(0, ErrorType.NO_FALSE_NEGATIVES);
    val allItems =
        Stream.concat(Arrays.stream(f1), Arrays.stream(f2))
            .map(Row::getItem)
            .distinct()
            .toArray(String[]::new);

    val s1sum = (double) s1.getStreamLength();
    val pmf1 = Arrays.stream(allItems).mapToDouble(l -> s1.getEstimate(l) / s1sum).toArray();

    val s2sum = (double) s2.getStreamLength();
    val pmf2 = Arrays.stream(allItems).mapToDouble(l -> s2.getEstimate(l) / s2sum).toArray();
    switch (algorithm) {
      case hellinger:
        return hellingerDistance(pmf1, pmf2);
      case psi:
        return psiMetric(pmf1, pmf2);
      case jensenshannon:
        return jensenShannonDivergence(pmf1, pmf2);
      case kl_divergence:
        return klDivergence(pmf1, pmf2);
      default:
        throw new NotImplementedException(
            String.format("Unimplemented drift algorithm = \"%s\"", algorithm.name()));
    }
  }
}

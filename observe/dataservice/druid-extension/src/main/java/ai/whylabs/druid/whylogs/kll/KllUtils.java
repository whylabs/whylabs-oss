package ai.whylabs.druid.whylogs.kll;

import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;

public class KllUtils {

  /**
   * Check if merging sketches would cause arithmetic overflow. logs an error and returns true if
   * overflows.
   */
  public static boolean overflow(KllDoublesSketch a, KllDoublesSketch b) {
    // TODO: handle overflow for doubles
    //    try {
    //      val sum = Math.addExact(a.getN(), b.getN());
    //      if (sum > (1L << 60)) {
    //        throw new ArithmeticException("Sum > 2^60");
    //      }
    //    } catch (ArithmeticException e) {
    //      // if you get here, it is too big
    //      log.error("Merged count ({} + {}) would exceed range of KllFloatsSketch", a.getN(),
    // b.getN());
    //      return true;
    //    }
    return false;
  }
}

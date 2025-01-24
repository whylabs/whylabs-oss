package ai.whylabs.monitor;

import static ai.whylabs.core.configV3.structure.Analyzers.DriftConfig.Algorithm.hellinger;
import static java.util.function.Function.identity;
import static java.util.stream.Collectors.toMap;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThan;
import static org.hamcrest.Matchers.not;

import ai.whylabs.core.calculations.math.Distance;
import ai.whylabs.druid.whylogs.column.WhyLogsMetrics;
import ai.whylabs.druid.whylogs.kll.KllDoublesSketchOperations;
import ai.whylabs.druid.whylogs.v1.WhyLogsV1toV0Iterator;
import com.google.common.collect.Lists;
import com.shaded.whylabs.com.apache.commons.lang3.StringUtils;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.utils.sketches.FrequentStringsSketch;
import java.io.BufferedInputStream;
import java.io.IOException;
import java.util.Map;
import lombok.Cleanup;
import lombok.NonNull;
import lombok.SneakyThrows;
import lombok.val;
import org.hamcrest.number.IsCloseTo;
import org.testng.annotations.Test;

public class DistanceTest {
  @Test
  public void testBaseCase() {
    // Python code
    // from keras.losses import kullback_leibler_divergence
    //
    // kld = kullback_leibler_divergence(K.constant([1]), K.constant([0.0]))
    // print(K.get_value(kld))
    double[] p1 = new double[] {0.5, 0.5};
    double[] p2 = new double[] {0.5, 0.5};
    double v = Distance.klDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0., 0.00001));
  }

  @Test
  public void testHellingerDistance() {
    // Python code
    // TBD

    // TODO: This works with our current implementation, but is not valid input
    // (probs arrays must sum to 1) and can be removed.
    double[] p1 = new double[] {1};
    double[] p2 = new double[] {0.0};
    double v = Distance.hellingerDistance(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.7071067811865475, 0.00001));

    p1 = new double[] {0.32573783, 0.26860953, 0.14846763, 0.10319746, 0.15398756};
    p2 = new double[] {0.32450529, 0.04326352, 0.26435823, 0.31585057, 0.05202239};
    v = Distance.hellingerDistance(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.3145182904022964, 0.00001));

    p1 = new double[] {0., 1.};
    p2 = new double[] {1., 0.};
    v = Distance.hellingerDistance(p1, p2);
    assertThat(v, IsCloseTo.closeTo(1.0, 0.00001));

    p1 = new double[] {0.5, 0.5};
    p2 = new double[] {0.5, 0.5};
    v = Distance.hellingerDistance(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.0, 0.00001));
  }

  @Test
  public void testPathologicalSketches() {
    KllDoublesSketch s1 = new KllDoublesSketch();
    s1.update(600.0f);
    s1.update(600.0f);

    // distance between identical distributions should be zero
    assertThat(Distance.continuous(hellinger, s1, s1), is(0d));

    KllDoublesSketch s2 = new KllDoublesSketch();
    s1.update(700.0f);
    s1.update(700.0f);

    // distance between different distributions should be non-zero
    assertThat(Distance.continuous(hellinger, s1, s2), is(1d));

    KllDoublesSketch s3 = new KllDoublesSketch();

    // distance between empty sketches should be zero
    assertThat(Distance.continuous(hellinger, s3, s3), is(0d));

    // distance between empty and non-empty sketches should be non-zero
    assertThat(Distance.continuous(hellinger, s1, s3), is(1d));
  }

  @Test
  public void testKlDivergence() {
    // Python code for testing:
    // from scipy.spatial import rel_entr
    // kl_div = np.sum(rel_entr(p1, p2))
    // The scipy method kl_div adds a term that is uncommon in ML. Use the rel_entr.
    // from evidently.calculations.stattests import kl_div_stat_test, psi_stat_test
    // from frouros.detectors.data_drift.batch import KL

    double[] p1 = new double[] {0., 1.};
    double[] p2 = new double[] {1., 0.};
    double v = Distance.klDivergence(p1, p2);
    // Should run, but undefined for vals without support (when there's a 0. in distr for
    // only one prob). Scipy: inf, Evidently: 9.2085, Frouros: 0.

    p1 = new double[] {0.5, 0.5};
    p2 = new double[] {0.5, 0.5};
    v = Distance.klDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.0, 0.00001));

    p1 = new double[] {0.32, 0.16, 0.28, 0.04, 0.2};
    p2 = new double[] {0.25, 0.0625, 0.4375, 0.1875, 0.0625};
    v = Distance.klDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.2752701838700412, 0.00001));

    p1 = new double[] {0.5826087, 0.1, 0.05217391, 0.24782609, 0.0173913};
    p2 = new double[] {0.67346939, 0.05102041, 0.00340136, 0.10884354, 0.16326531};
    v = Distance.klDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.29028390374880353, 0.00001));

    p1 = new double[] {0.4, 0.4, 0.2};
    p2 = new double[] {0.5, 0., 0.5};
    v = Distance.klDivergence(p1, p2);
    // Should run, but value undefined (scipy: inf, Evidently: 3.0452)
  }

  @Test
  public void testPsiMetric() {
    // Python code for testing:
    // See: https://www.kaggle.com/code/podsyp/population-stability-index/notebook
    // from evidently.calculations.stattests import psi_stat_test
    // from frouros.detectors.data_drift.batch import PSI

    double[] p1 = new double[] {0., 1.};
    double[] p2 = new double[] {1., 0.};
    double v = Distance.psiMetric(p1, p2);
    // Should run, but value undefined (Kaggle, unofficial: 9.209,
    // Evidently: 18.4188, Frouros: 1416.7928370645282).

    p1 = new double[] {0.5, 0.5};
    p2 = new double[] {0.5, 0.5};
    v = Distance.psiMetric(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.0, 0.00001));

    p1 = new double[] {0.32, 0.16, 0.28, 0.04, 0.2};
    p2 = new double[] {0.25, 0.0625, 0.4375, 0.1875, 0.0625};
    v = Distance.psiMetric(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.5670270283866204, 0.00001));

    p1 = new double[] {0.5826087, 0.1, 0.05217391, 0.24782609, 0.0173913};
    p2 = new double[] {0.67346939, 0.05102041, 0.00340136, 0.10884354, 0.16326531};
    v = Distance.psiMetric(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.6203258001760216, 0.00001));

    p1 = new double[] {0.4, 0.4, 0.2};
    p2 = new double[] {0.5, 0., 0.5};
    v = Distance.psiMetric(p1, p2);
    // Should run, but value undefined (however both Kaggle and Evidently get 3.6139)
  }

  @Test
  public void testJensenShannonDivergence() {
    // Python code for testing:
    // from scipy.spatial.distance import jensenshannon
    // from evidently.calculations.stattests import jensenshannon_stat_test
    // from frouros.detectors.data_drift.batch import JS

    double[] p1 = new double[] {0., 1.};
    double[] p2 = new double[] {1., 0.};
    double v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.8325546111576977, 0.00001));

    p1 = new double[] {0.5, 0.5};
    p2 = new double[] {0.5, 0.5};
    v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.0, 0.00001));

    p1 = new double[] {0.32, 0.16, 0.28, 0.04, 0.2};
    p2 = new double[] {0.25, 0.0625, 0.4375, 0.1875, 0.0625};
    v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.2584730043524462, 0.00001));

    p1 = new double[] {0.5826087, 0.1, 0.05217391, 0.24782609, 0.0173913};
    p2 = new double[] {0.67346939, 0.05102041, 0.00340136, 0.10884354, 0.16326531};
    v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.25777927185202415, 0.00001));

    p1 = new double[] {0.4, 0.4, 0.2};
    p2 = new double[] {0.5, 0., 0.5};
    v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.4178757172728631, 0.00001));

    // specific example derived from customer data that previously returned infinity.
    p1 =
        new double[] {
          0.0,
          0.0,
          0.0,
          2.4627129861934155E-4,
          0.0,
          0.0011082208437870368,
          0.0014776277917160493,
          0.014283735319921808,
          0.08831904446736136,
          0.49411257676738135,
          0.23879080792377902,
          0.09366005325616833,
          0.039434191691422066,
          0.01576136311163786,
          0.00640305376410288,
          0.004432883375148147,
          0.0,
          0.0,
          0.0,
          0.0019701703889547324,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0
        };
    p2 =
        new double[] {
          0.0,
          0.0,
          0.0,
          1.5190931014184532E-4,
          0.0,
          0.0012152744811347626,
          0.0,
          0.014887112393900842,
          0.08945559500977916,
          0.4898125818886125,
          0.23798492300096843,
          0.0968421852154264,
          0.037825418225319485,
          0.015190931014184532,
          0.006532100336099349,
          0.0036458234434042875,
          0.006228281715815658,
          0.0,
          0.0,
          1.5190931014184532E-4,
          0.0,
          0.0,
          0.0,
          0.0,
          7.595465507092266E-5,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0
        };
    v = Distance.jensenShannonDivergence(p1, p2);
    assertThat(v, IsCloseTo.closeTo(0.0567420668932825, 0.00001));
  }

  @Test
  public void testContinuousDistance() {

    KllDoublesSketch s1 = new KllDoublesSketch();
    s1.update(1.0f);
    s1.update(5.0f);
    s1.update(16.0f);
    s1.update(22.0f);

    // distance between identical distributions should be zero
    assertThat(Distance.continuous(hellinger, s1, s1), is(0d));

    KllDoublesSketch s2 = new KllDoublesSketch();
    s2.update(2.0f);
    s2.update(3.0f);
    s2.update(4.0f);
    s2.update(12.0f);

    // distance between different distributions should be non-zero
    assertThat(Distance.continuous(hellinger, s1, s2), not(IsCloseTo.closeTo(0d, 0d)));
  }

  @Test
  public void testDiscreteDistance() {
    ItemsSketch<String> s1 = FrequentStringsSketch.create();
    s1.update("foo1");
    s1.update("foo2");
    s1.update("foo3");
    s1.update("foo4");
    s1.update("foo5");

    // distance between identical distributions should be zero
    assertThat(Distance.discrete(hellinger, s1, s1), is(0d));

    ItemsSketch<String> s2 = FrequentStringsSketch.create();
    s2.update("bar1");
    s2.update("bar2");
    s2.update("bar3");
    s2.update("bar4");
    s2.update("bar5");
    double d2 = Distance.discrete(hellinger, s1, s2);
    // distance between different distributions should be non-zero
    assertThat(d2, not(0));

    ItemsSketch<String> s3 = FrequentStringsSketch.create();
    s3.update("foo1");
    s3.update("bar2");
    s3.update("bar3");
    s3.update("bar4");
    s3.update("bar5");
    double d3 = Distance.discrete(hellinger, s1, s3);
    // one item in common, distance should be less
    assertThat(d3, lessThan(d2));
  }

  @NonNull
  public Map<String, WhyLogsMetrics> getMetrics(String resourceName) throws IOException {
    @Cleanup val is = getClass().getResourceAsStream(resourceName);
    @Cleanup val bis = new BufferedInputStream(is);
    @Cleanup val reader = new WhyLogsV1toV0Iterator(bis);

    return Lists.newArrayList(reader).stream().collect(toMap(WhyLogsMetrics::getName, identity()));
  }

  public KllDoublesSketch getkll(WhyLogsMetrics metric) throws IOException {
    val h = metric.getRaw("histogram");
    return KllDoublesSketchOperations.deserialize(h);
  }

  /**
   * Hellinger distance is formally a "metric", which means order of the distributions being
   * measured should not make a difference. This test makes sure the order of profiles being
   * measured does not make a difference.
   */
  @Test
  @SneakyThrows
  public void test_hellinger() {
    val metrics1 =
        getMetrics(
            "/profiles/org-HVB9AM-model-3-2022-12-07T212329.094-Bhwgeq9gbaKRCkDThiCzBVcURWHvTExA.bin");
    val metrics2 =
        getMetrics(
            "/profiles/org-HVB9AM-model-3-2022-12-07T212329.109-21CZD2HbQnVQYBSDfBlYYGjEYFskylDS.bin");

    // calculate distance between matching features in the two profiles.
    metrics1.entrySet().stream()
        .forEach(
            e -> {
              val m2 = metrics2.get(e.getKey());
              if (m2 != null) {
                try {
                  val k1 = this.getkll(e.getValue());
                  val k2 = this.getkll(m2);
                  double d1 = 0.0;
                  if (k1 != null && k2 != null) {
                    d1 = Distance.continuous(hellinger, k1, k2);
                  }
                  double d2 = 0.0;
                  if (k1 != null && k2 != null) {
                    d2 = Distance.continuous(hellinger, k2, k1);
                  }
                  // assert that the distance is symmetric
                  assertThat(d1, IsCloseTo.closeTo(d2, 0.00001));

                  // assert calculated distance matches expected distance encoded in the name.
                  // e.g. normal_size5000_drift0.05_hel0.0562959
                  val name = e.getKey();
                  val expected = Double.parseDouble(StringUtils.substringAfter(name, "_hel"));
                  assertThat(d1, IsCloseTo.closeTo(expected, 0.00001));
                } catch (IOException exp) {
                  exp.printStackTrace();
                }
              }
            });
  }
}

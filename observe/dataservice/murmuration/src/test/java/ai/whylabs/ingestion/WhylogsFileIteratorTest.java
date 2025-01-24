package ai.whylabs.ingestion;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasItems;
import static org.testng.Assert.*;

import java.util.Objects;
import lombok.val;
import org.testng.annotations.Test;

public class WhylogsFileIteratorTest {
  public static final String SEGMENTED_V0_PROFILE =
      "/reference-profiles/2021-05-28/org-0-model-0-3OAzVit8a521yyCppfaP2ZEHcZtWwcWR.bin";
  // parallel json metadata that will consumed internally
  // "/reference-profiles/2021-05-28/org-0-model-0-3OAzVit8a521yyCppfaP2ZEHcZtWwcWR.json";
  public static final String V1_PROFILE = "/profiles/2021-05-14/profiles-v1.bin";
  public static final String NOTA_PROFILE = "/output_whylogs.parquet";
  public static final String CLASSIFICATIION_PROFILE =
      "/profiles/org-0-model-2120-2022-11-05T211013.519-yfvWEb3geLbBTIczATGYrVy7arPfTdgc.bin";

  /**
   * assert that when reading a profile that contains classification model metrics, the first
   * metricComponent generated looks like a dataset metric.
   */
  @Test
  public void testIngestPerformanceMetrics() {
    val resourceName = Objects.requireNonNull(getClass().getResource(CLASSIFICATIION_PROFILE));

    val it = new WhylogsFileIterator(resourceName);
    assertTrue(it.hasNext());
    val mit = it.next();
    assertTrue(mit.hasNext());
    val pair = mit.next();
    assertNull(pair.getKey());
    val colMsg = pair.getValue();
    assertThat(colMsg.getMetricComponentsCount(), is(1));
    val m = colMsg.getMetricComponentsMap();
    val f = m.keySet();
    assertThat(m.keySet(), hasItems("model/classification"));
    val mcMsg = m.get("model/classification");
    assertTrue(mcMsg.hasMsg());
  }

  @Test
  public void testIngestV0() {
    val resourceName = Objects.requireNonNull(getClass().getResource(SEGMENTED_V0_PROFILE));

    val it = new WhylogsFileIterator(resourceName);
    assertTrue(it.hasNext());
    while (it.hasNext()) {
      val mit = it.next();
      while (mit.hasNext()) {
        val pair = mit.next();
        System.out.println(pair.getKey());
      }
    }
  }

  @Test
  public void testIngestV1() {
    val resourceName = Objects.requireNonNull(getClass().getResource(V1_PROFILE));

    val it = new WhylogsFileIterator(resourceName);
    assertTrue(it.hasNext());
    while (it.hasNext()) {
      val mit = it.next();
      while (mit.hasNext()) {
        val pair = mit.next();
        System.out.println(pair.getKey());
      }
    }
  }

  @Test(expectedExceptions = {RuntimeException.class})
  public void testBadIngest() {
    val resourceName = Objects.requireNonNull(getClass().getResource(NOTA_PROFILE));

    val it = new WhylogsFileIterator(resourceName);
    it.hasNext();
  }
}

package ai.whylabs.core.metrics;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.number.IsCloseTo.closeTo;
import static org.testng.Assert.assertNotNull;
import static org.testng.AssertJUnit.assertEquals;

import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.druid.whylogs.variance.VarianceOperations;
import com.google.gson.Gson;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.whylogs.core.statistics.datatypes.VarianceTracker;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.stream.DoubleStream;
import lombok.val;
import org.testng.annotations.Test;

public class AnalyzerMetricTest {

  // @Test TODO: Revisit
  public void testAnalysisMetricExtractor() {
    String serializedQueryResultStructure =
        "{\"columnName\":\"dti\",\"datasetid\":\"model-0\",\"orgid\":\"org-11\",\"segmentText\":\"\",\"frequentItems\":[4,1,10,5,5,0,0,0,21,0,0,0,0,0,0,0,46,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,12,0,0,0,48,46,53,52,50,55,48,56,55,54,51,49,12,0,0,0,56,46,53,53,48,55,53,52,48,50,50,55,12,0,0,0,51,46,57,54,56,54,56,54,52,48,56,50,12,0,0,0,55,46,52,48,49,54,57,48,55,49,55,50,13,0,0,0,45,48,46,56,48,55,48,53,48,51,49,56,53,12,0,0,0,54,46,53,51,55,56,52,50,56,52,55,50,13,0,0,0,49,50,46,50,51,51,54,55,49,48,51,56,55,13,0,0,0,49,50,46,52,55,54,53,52,55,55,53,48,55,12,0,0,0,51,46,52,54,48,56,53,52,56,48,48,53,13,0,0,0,49,49,46,50,52,50,53,53,48,56,49,54,49,13,0,0,0,49,51,46,52,53,53,49,51,54,52,56,48,51,12,0,0,0,54,46,54,50,56,54,54,54,48,56,55,50,12,0,0,0,57,46,56,56,56,53,54,54,49,50,52,53,12,0,0,0,57,46,50,56,52,57,56,50,48,51,56,57,13,0,0,0,45,52,46,57,48,51,57,53,49,55,49,48,49,13,0,0,0,49,52,46,50,51,52,48,52,55,56,50,52,57,13,0,0,0,45,53,46,56,57,52,48,57,49,51,52,57,50,13,0,0,0,49,50,46,51,57,54,52,55,54,57,57,57,49,12,0,0,0,57,46,56,54,56,56,50,53,56,50,49,52,11,0,0,0,51,46,49,55,54,53,56,53,51,49,51,12,0,0,0,54,46,54,53,52,54,53,54,52,51,51,51],\"histogram\":[6,1,15,0,0,1,8,0,46,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,-46,0,0,0,0,0,0,-64,2,-8,27,-64,0,0,0,0,78,68,54,64,0,0,0,-64,84,-101,29,64,0,0,0,64,-64,38,26,64,0,0,0,-128,-91,105,9,64,0,0,0,-96,-44,-81,11,64,0,0,0,32,-43,119,44,64,0,0,0,-64,-34,93,-31,63,0,0,0,64,91,-45,-23,-65,0,0,0,64,94,-98,26,64,0,0,0,-96,7,-23,42,64,0,0,0,0,-1,-54,40,64,0,0,0,96,-4,25,33,64,0,0,0,-96,47,124,38,64,0,0,0,32,-2,-13,40,64,0,0,0,0,-63,-125,26,64,0,0,0,-96,-116,-109,23,-64,0,0,0,32,-14,-58,35,64,0,0,0,-64,-93,119,40,64,0,0,0,-128,-91,-99,19,-64,0,0,0,32,-23,-111,34,64,0,0,0,-96,-34,-65,15,64,0,0,0,-64,-42,-68,35,64,0,0,0,-96,-44,46,8,64,0,0,0,-96,123,-102,-16,63,0,0,0,0,-87,-14,-32,63,0,0,0,-32,59,51,8,64,0,0,0,-96,-90,-18,-12,-65,0,0,0,-64,90,123,21,64,0,0,0,-32,3,-113,36,64,0,0,0,-128,-21,-108,34,64,0,0,0,-96,13,42,39,64,0,0,0,64,122,48,21,-64,0,0,0,32,-38,60,14,-64,0,0,0,64,-23,81,20,64,0,0,0,96,-25,120,15,64,0,0,0,-32,-7,-32,45,64,0,0,0,-96,65,33,27,64,0,0,0,32,-114,-43,47,64,0,0,0,-64,2,-8,27,-64,0,0,0,-96,-80,118,35,64,0,0,0,-32,-90,31,49,64,0,0,0,-96,-19,102,46,64,0,0,0,-128,79,-126,29,64,0,0,0,0,78,68,54,64,0,0,0,32,49,1,22,64,0,0,0,32,-10,-51,47,64,0,0,0,32,-60,-17,41,64],\"hll\":[3,1,7,12,6,8,0,1,46,0,0,0,23,26,-13,10,-63,113,-73,17,2,-18,38,8,68,-103,-20,5,-123,-22,54,16,70,-58,-84,4,30,-118,25,4,-69,-79,-11,15,11,104,92,8,-52,52,-69,11,14,77,-114,7,-113,54,-128,8,80,78,28,4,-110,-110,-65,7,83,113,-13,4,59,-122,78,9,-105,3,-40,14,-103,-80,122,18,-38,-88,5,7,28,-36,-44,7,-34,68,-30,5,-33,-28,-27,5,-96,-87,-54,4,99,97,-41,10,36,83,67,11,-27,-55,-5,17,-27,106,97,4,43,-112,6,5,-34,-47,40,4,-6,-36,-84,10,110,0,33,6,-17,121,-70,5,112,-105,-118,4,16,-88,-121,14,50,-89,40,22,-77,115,-46,11,-20,16,26,27,54,112,-1,13,119,-126,89,5,-72,112,47,5,-6,-125,-16,14,-5,36,102,19,-4,-28,36,5,-67,-38,-57,16,-72,-64,63,5,127,-106,72,4],\"totalCount\":46,\"schemaCountUnknown\":0,\"schemaCountFractional\":46,\"schemaCountIntegral\":0,\"schemaCountBoolean\":0,\"schemaCountString\":0,\"nullCount\":0,\"unique\":46.0,\"discrete\":false,\"inferredType\":{\"type\":\"FRACTIONAL\",\"ratio\":1.0},\"rollupTimestamp\":1621382400000,\"missing\":false,\"weight\":1,\"classifier\":\"input\",\"mostRecentDatalakeWriteTs\":1629210441069}\n";
    ZonedDateTime now = ZonedDateTime.now();

    Gson gson = new Gson();
    QueryResultStructure structure =
        gson.fromJson(serializedQueryResultStructure, QueryResultStructure.class);

    assertEquals(java.util.Optional.of(46.0d), Optional.of(extract(structure, "count", now)));
    assertThat(7.377256393432617d, closeTo((Double) extract(structure, "median", now), 0.01));
    assertThat(7.377256393432617d, closeTo((Double) extract(structure, "mean", now), 0.01));
    assertThat(7.377256393432617d, closeTo((Double) extract(structure, "stddev", now), 0.01));
    assertThat(22.266815185546875, closeTo((Double) extract(structure, "max", now), 0.01));
    assertThat(-6.9921979904174805, closeTo((Double) extract(structure, "min", now), 0.01));
    assertNotNull(extract(structure, "histogram", now));
    assertNotNull(extract(structure, "frequent_items", now));
    assertNotNull(extract(structure, "frequent_items", now));
    assertEquals(java.util.Optional.of(0l), Optional.of(extract(structure, "count_null", now)));
    assertThat(0d, closeTo((Double) extract(structure, "count_null_ratio", now), 0.01));
    assertEquals(java.util.Optional.of(0l), Optional.of(extract(structure, "count_bool", now)));
    assertThat(0d, closeTo((Double) extract(structure, "count_bool_ratio", now), 0.01));
    assertEquals(java.util.Optional.of(0l), Optional.of(extract(structure, "count_integral", now)));
    assertThat(0d, closeTo((Double) extract(structure, "count_integral_ratio", now), 0.01));
    assertEquals(
        java.util.Optional.of(46l), Optional.of(extract(structure, "count_fractional", now)));
    assertThat(1d, closeTo((Double) extract(structure, "count_fractional_ratio", now), 0.01));
    assertEquals(java.util.Optional.of(0l), Optional.of(extract(structure, "count_string", now)));
    assertThat(0d, closeTo((Double) extract(structure, "count_string_ratio", now), 0.01));
    assertEquals("FRACTIONAL", extract(structure, "inferred_data_type", now));

    // TODO: Fill in for dataset level metrics
  }

  private Object extract(QueryResultStructure structure, String metric, ZonedDateTime now) {
    val m = AnalysisMetric.fromName(metric);
    val value = m.apply(structure, now);
    val expectedType = AnalysisMetric.getExtractorOutputType(m);
    assertEquals(expectedType, value.getClass());
    return value;
  }

  @Test
  public void testQuantileMetrics() {
    KllDoublesSketch kll = new KllDoublesSketch();
    DoubleStream.iterate(0.0, i -> i + 100.0).limit(100).forEach(d -> kll.update(d));
    ZonedDateTime now = ZonedDateTime.now();
    QueryResultStructure row =
        new QueryResultStructure(ExplodedRow.builder().histogram(kll.toByteArray()).build(), null);
    Double value = AnalysisMetric.fromName("quantile_5").apply(row, now);
    assertThat(value, closeTo((Double) 500D, 0.01));
    value = AnalysisMetric.fromName("quantile_25").apply(row, now);
    assertThat(value, closeTo((Double) 2500D, 0.01));
    value = AnalysisMetric.fromName("quantile_75").apply(row, now);
    assertThat(value, closeTo((Double) 7500D, 0.01));
    value = AnalysisMetric.fromName("quantile_90").apply(row, now);
    assertThat(value, closeTo((Double) 9000D, 0.01));
    value = AnalysisMetric.fromName("quantile_95").apply(row, now);
    assertThat(value, closeTo((Double) 9500D, 0.01));
    value = AnalysisMetric.fromName("quantile_99").apply(row, now);
    assertThat(value, closeTo((Double) 9900D, 0.01));
  }

  @Test
  public void testStddevMetric() {
    val variance = new VarianceTracker();
    DoubleStream.iterate(0, n -> n + 1)
        .limit(5000)
        .map(n -> n + 100)
        .forEach(d -> variance.update(d));
    QueryResultStructure row =
        new QueryResultStructure(
            ExplodedRow.builder().variance_tracker(VarianceOperations.serialize(variance)).build(),
            null);

    // make sure we are not too far off from the true value calculated in numpy.
    Double value = AnalysisMetric.fromName("stddev").apply(row, ZonedDateTime.now());
    assertThat(value, closeTo((Double) 1443.3756, 0.15));
  }
}

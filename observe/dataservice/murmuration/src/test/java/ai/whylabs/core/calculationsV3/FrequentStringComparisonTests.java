package ai.whylabs.core.calculationsV3;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.testng.AssertJUnit.assertEquals;
import static org.testng.AssertJUnit.assertNull;

import ai.whylabs.core.aggregation.BaselineRoller;
import ai.whylabs.core.calculationsV3.results.FrequentStringComparisonResult;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonConfig;
import ai.whylabs.core.configV3.structure.Analyzers.FrequentStringComparisonOperator;
import ai.whylabs.core.configV3.structure.ColumnMatrix;
import ai.whylabs.core.configV3.structure.CronSchedule;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import ai.whylabs.druid.whylogs.frequency.FrequencyOperations;
import com.shaded.whylabs.org.apache.datasketches.frequencies.ItemsSketch;
import java.util.Arrays;
import java.util.Collections;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.testng.annotations.Test;

public class FrequentStringComparisonTests {
  FrequentStringComparison targetIncludesAllBaselineAnalyzer =
      new FrequentStringComparison(
          null,
          null,
          false,
          FrequentStringComparisonConfig.builder()
              .operator(FrequentStringComparisonOperator.target_includes_all_baseline)
              .build());
  FrequentStringComparison baselineIncludesAllTargetAnalyzer =
      new FrequentStringComparison(
          null,
          null,
          false,
          FrequentStringComparisonConfig.builder()
              .operator(FrequentStringComparisonOperator.baseline_includes_all_target)
              .build());
  FrequentStringComparison exactMatchAnalyzer =
      new FrequentStringComparison(
          null,
          null,
          false,
          FrequentStringComparisonConfig.builder()
              .operator(FrequentStringComparisonOperator.eq)
              .build());

  @Test
  public void testIdentical() {
    ItemsSketch<String> s1 = new ItemsSketch<>(64);
    s1.update("foo1");
    s1.update("foo3");
    s1.update("foo2");
    ItemsSketch<String> s2 = new ItemsSketch<>(64);
    s2.update("foo1");
    s2.update("foo2");
    s2.update("foo3");
    val baseline = Arrays.asList(Pair.of(0l, s1));
    val target = Arrays.asList(Pair.of(0l, s2));
    assertEquals(0l, exactMatchAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
    assertEquals(
        0l, targetIncludesAllBaselineAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
    assertEquals(
        0l, baselineIncludesAllTargetAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
  }

  @Test
  public void testStringCrop() {
    ItemsSketch<String> s1 = new ItemsSketch<>(64);
    s1.update(
        "foo1thoeuntheounthoeunthoeutnhuoenthuoenthuoenthoeutnhoeunthoeuthnueontheuothnouethnoeunthouenthoeunhtuoenthoeunthoeunthoeunthouentheuonoe987243ntheui98723tnoeu98732nmbteu98732ntekuo23t");
    ItemsSketch<String> s2 = new ItemsSketch<>(64);
    s2.update(
        "foo1thoeuntheounthoeunthoeutnhuoenthuoenthuoenthoeutnhoeunthoeuthnueontheuothnouethnoeunthouenthoeunhtuoenthoeunthoeunthoeunthouentheuonoe987243ntheui98723tnoeu98732nmbteu98732ntekuo23t_extra");
    val baseline = Arrays.asList(Pair.of(0l, s1));
    val target = Arrays.asList(Pair.of(0l, s2));
    assertEquals(0l, exactMatchAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
  }

  @Test
  public void testSubset() {
    ItemsSketch<String> b = new ItemsSketch<>(64);
    b.update("foo1");
    b.update("foo3");
    b.update("foo2");
    ItemsSketch<String> t = new ItemsSketch<>(64);
    t.update("foo1");
    val baseline = Arrays.asList(Pair.of(0l, b));
    val target = Arrays.asList(Pair.of(0l, t));

    val r1 =
        ((FrequentStringComparisonResult) exactMatchAnalyzer.calculate(baseline, target, null));
    assertEquals(FrequentStringComparisonOperator.eq, r1.getOperator());
    assertEquals(2, r1.getSample().size());
    assertEquals(2, r1.getSampleCounts().size());
    assertEquals(1l, r1.getAlertCount(), 0);

    val r2 =
        ((FrequentStringComparisonResult)
            targetIncludesAllBaselineAnalyzer.calculate(baseline, target, null));
    assertEquals(FrequentStringComparisonOperator.target_includes_all_baseline, r2.getOperator());
    assertEquals(2, r2.getSample().size());
    assertEquals(2, r2.getSampleCounts().size());
    assertEquals(1l, r2.getAlertCount(), 0);

    val r3 =
        ((FrequentStringComparisonResult)
            baselineIncludesAllTargetAnalyzer.calculate(baseline, target, null));
    assertEquals(FrequentStringComparisonOperator.baseline_includes_all_target, r3.getOperator());
    assertEquals(0l, r3.getAlertCount(), 0);
    assertNull(r3.getSample());
    assertNull(r3.getSampleCounts());
  }

  @Test
  public void testCropSample() {
    ItemsSketch<String> b = new ItemsSketch<>(64);
    b.update("foo1");
    b.update("foo2");
    b.update("foo3");
    b.update("foo4");
    b.update("foo5");
    b.update("foo6");
    b.update("foo7");
    ItemsSketch<String> t = new ItemsSketch<>(64);
    t.update("foo1");
    val baseline = Arrays.asList(Pair.of(0l, b));
    val target = Arrays.asList(Pair.of(0l, t));

    val r1 =
        ((FrequentStringComparisonResult) exactMatchAnalyzer.calculate(baseline, target, null));
    assertEquals(FrequentStringComparisonOperator.eq, r1.getOperator());
    assertEquals(FrequentStringComparison.SAMPLE_SIZE, r1.getSample().size());
    assertEquals(FrequentStringComparison.SAMPLE_SIZE, r1.getSampleCounts().size());
  }

  @Test
  public void testSubsetReversed() {
    ItemsSketch<String> b = new ItemsSketch<>(64);
    b.update("foo1");
    ItemsSketch<String> t = new ItemsSketch<>(64);
    t.update("foo1");
    t.update("foo3");
    t.update("foo2");
    val baseline = Arrays.asList(Pair.of(0l, b));
    val target = Arrays.asList(Pair.of(0l, t));
    assertEquals(1l, exactMatchAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
    assertEquals(
        0l, targetIncludesAllBaselineAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
    assertEquals(
        1l, baselineIncludesAllTargetAnalyzer.calculate(baseline, target, null).getAlertCount(), 0);
  }

  @SneakyThrows
  @Test
  public void testEnd2EndAnalyzerResult() {

    ItemsSketch<String> s1 = new ItemsSketch<>(64);
    s1.update("foo1");
    s1.update("foo1");
    s1.update("foo1");
    s1.update("foo1");
    s1.update("foo1");
    s1.update("foo1");
    s1.update("foo3");
    s1.update("foo3");
    s1.update("foo3");
    s1.update("foo2");
    s1.update("foo2");
    ItemsSketch<String> s2 = new ItemsSketch<>(64);
    s2.update("foo1");
    s2.update("foo1");
    s2.update("foo1");

    QueryResultStructure baseline =
        new QueryResultStructure(
            ExplodedRow.builder()
                .missing(Boolean.FALSE)
                .ts(0L)
                .columnName("column")
                .frequentItems(FrequencyOperations.serialize(s1))
                .build(),
            0L);
    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder()
                .missing(Boolean.FALSE)
                .ts(0L)
                .columnName("column")
                .frequentItems(FrequencyOperations.serialize(s2))
                .build(),
            0L);

    FrequentStringComparisonConfig config =
        FrequentStringComparisonConfig.builder()
            .metric("frequent_items")
            .operator(FrequentStringComparisonOperator.eq)
            .build();
    val analyzer =
        Analyzer.builder()
            .id("testing")
            .disabled(false)
            .config(config)
            .targetMatrix(ColumnMatrix.builder().include(Collections.singletonList("*")).build())
            .schedule(CronSchedule.builder().cron("0 * * * *").build())
            .build();
    val monitor =
        MonitorConfigV3.builder()
            .granularity(Granularity.daily)
            .analyzers(Arrays.asList(analyzer))
            .build();

    val calculation = config.toCalculation(monitor, true, analyzer);

    AnalyzerResult result =
        calculation.run(
            Arrays.asList(baseline),
            new BaselineRoller(baseline),
            target,
            Arrays.asList(target),
            target,
            0L,
            "abcd",
            null,
            null,
            0l);

    // verify that analyzer results has the expected sample counts.
    assertThat(result.getFrequentStringComparison_sample(), hasSize(2));
    assertThat(result.getFreqStringCount(), hasSize(2));

    // debug snippet that comes in handy
    //    val toJson = new AnalyzerResultToJson();
    //    val it = toJson.call(Collections.singleton(result).iterator());
    //    for (; it.hasNext(); ) {
    //      val s = it.next();
    //      System.out.println(s);
    //    }
  }
}

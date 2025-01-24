package ai.whylabs.core.calculationsV3;

import static org.testng.AssertJUnit.assertEquals;
import static org.testng.AssertJUnit.assertNull;

import ai.whylabs.core.aggregation.BaselineRoller;
import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.FixedThresholdsConfig;
import ai.whylabs.core.configV3.structure.ColumnMatrix;
import ai.whylabs.core.configV3.structure.MonitorConfigV3;
import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import ai.whylabs.core.configV3.structure.enums.Granularity;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.structures.monitor.events.AnalyzerResult;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Optional;
import lombok.val;
import org.testng.annotations.Test;

public class MissingDataCalculationTest {

  @Test
  public void testMissingDatapointHairTrigger() {
    val config =
        FixedThresholdsConfig.builder()
            .metric(AnalysisMetric.missingDatapoint.name())
            .upper(0.0) // Hair trigger
            .build();
    val analyzer =
        Analyzer.builder()
            .id("abcd")
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("*")).build())
            .config(config)
            .build();
    val conf = MonitorConfigV3.builder().granularity(Granularity.daily).build();
    val calc = new FixedThresholdCalculationLong(conf, analyzer, true, config);

    QueryResultStructure baseline =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(false).datasetId("b").build(), null);

    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(true).datasetId("b").build(), null);
    Long targetBatchTimestamp = 1646352000000l;
    val dt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    AnalyzerResult result =
        calc.run(
            Arrays.asList(baseline),
            new BaselineRoller(baseline),
            target,
            Arrays.asList(target),
            target,
            targetBatchTimestamp,
            "abcd",
            null,
            dt,
            0l);
    assertEquals(java.util.Optional.of(1l), Optional.of(result.getAnomalyCount()));
    assertEquals(
        java.util.Optional.of(targetBatchTimestamp), Optional.of(result.getDatasetTimestamp()));
  }

  @Test
  public void testMissingPredatesActualData() {
    val config =
        FixedThresholdsConfig.builder()
            .metric(AnalysisMetric.missingDatapoint.name())
            .upper(0.0) // Hair trigger
            .build();
    val analyzer =
        Analyzer.builder()
            .id("abcd")
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("*")).build())
            .config(config)
            .build();
    val conf = MonitorConfigV3.builder().granularity(Granularity.daily).build();
    val calc = new FixedThresholdCalculationLong(conf, analyzer, true, config);

    QueryResultStructure baseline =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(false).datasetId("b").build(), null);
    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(true).datasetId("b").build(), null);
    Long targetBatchTimestamp = 1646352000000l;
    val dt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    AnalyzerResult result =
        calc.run(
            Arrays.asList(baseline),
            new BaselineRoller(baseline),
            target,
            Arrays.asList(target),
            target,
            targetBatchTimestamp,
            "abcd",
            null,
            dt,
            targetBatchTimestamp + 1);
    assertNull(result);
  }

  @Test
  public void testMissingDatapointBelowThreshold() {
    val config =
        FixedThresholdsConfig.builder()
            .metric(AnalysisMetric.missingDatapoint.name())
            .upper(2.0) // Higher Threshold
            .build();
    val analyzer =
        Analyzer.builder()
            .id("abcd")
            .targetMatrix(ColumnMatrix.builder().include(Arrays.asList("*")).build())
            .config(config)
            .build();
    val conf = MonitorConfigV3.builder().granularity(Granularity.daily).build();
    val calc = new FixedThresholdCalculationLong(conf, analyzer, true, config);

    QueryResultStructure baseline =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(false).datasetId("b").build(), null);
    QueryResultStructure target =
        new QueryResultStructure(
            ExplodedRow.builder().orgId("a").missing(true).datasetId("b").build(), null);
    Long targetBatchTimestamp = 1646352000000l;
    val dt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(targetBatchTimestamp), ZoneOffset.UTC);
    AnalyzerResult result =
        calc.run(
            Arrays.asList(baseline),
            new BaselineRoller(baseline),
            target,
            Arrays.asList(target),
            target,
            targetBatchTimestamp,
            "abcd",
            null,
            dt,
            0l);
    assertEquals(java.util.Optional.of(0l), Optional.of(result.getAnomalyCount()));
  }
}

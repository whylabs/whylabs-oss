package ai.whylabs.dataservice.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ai.whylabs.core.configV3.structure.*;
import ai.whylabs.dataservice.diagnostics.AnalysisGateAnalysisRunner;
import ai.whylabs.dataservice.diagnostics.enums.AnalyzerGateObservation;
import java.time.Duration;
import java.util.Arrays;
import lombok.val;
import org.junit.jupiter.api.Test;

public class DiagnosticTest {

  @Test
  public void testDataReadinessShort() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        .dataReadinessDuration(Duration.ofMinutes(30))
                        .build()))
            .build();
    // Simulate data arriving 90min after the fact
    val r = new AnalysisGateAnalysisRunner().analyzeDataReadinessDuration(conf1, 90l);
    assertEquals(r.get(0).getObservation(), AnalyzerGateObservation.SHORT);
  }

  @Test
  public void testDataReadinessLong() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        // 2days is a pretty long time to wait for data that's uploaded 90min after
                        .dataReadinessDuration(Duration.ofDays(2))
                        .build()))
            .build();
    // Simulate data arriving 90min after the fact
    val r = new AnalysisGateAnalysisRunner().analyzeDataReadinessDuration(conf1, 90l);
    assertEquals(r.get(0).getObservation(), AnalyzerGateObservation.LONG);
  }

  @Test
  public void testDataReadinessFine() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        .dataReadinessDuration(Duration.ofMinutes(30))
                        .build()))
            .build();

    assertEquals(
        new AnalysisGateAnalysisRunner()
            .analyzeDataReadinessDuration(conf1, 28l)
            .get(0)
            .getObservation(),
        AnalyzerGateObservation.FINE);
  }

  @Test
  public void testBatchCooldownShort() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        .batchCoolDownPeriod(Duration.ofMinutes(30))
                        .build()))
            .build();

    val r = new AnalysisGateAnalysisRunner().analyzeBatchCooldownDuration(conf1, 90l);
    assertEquals(r.get(0).getObservation(), AnalyzerGateObservation.SHORT);
  }

  @Test
  public void testBatchCooldownLong() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        // 2days is a pretty long time to wait for data that always uploaded <90min
                        .batchCoolDownPeriod(Duration.ofDays(2))
                        .build()))
            .build();
    val r = new AnalysisGateAnalysisRunner().analyzeBatchCooldownDuration(conf1, 90l);
    assertEquals(r.get(0).getObservation(), AnalyzerGateObservation.LONG);
  }

  @Test
  public void testBatchCooldownFine() {
    val conf1 =
        MonitorConfigV3.builder()
            .granularity(ai.whylabs.core.configV3.structure.enums.Granularity.daily)
            .analyzers(
                Arrays.asList(
                    Analyzer.builder()
                        .id("abcd")
                        .batchCoolDownPeriod(Duration.ofMinutes(30))
                        .build()))
            .build();

    assertEquals(
        new AnalysisGateAnalysisRunner()
            .analyzeBatchCooldownDuration(conf1, 28l)
            .get(0)
            .getObservation(),
        AnalyzerGateObservation.FINE);
  }
}

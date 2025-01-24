package ai.whylabs.core.validation;

import static org.testng.Assert.assertFalse;
import static org.testng.Assert.assertTrue;

import ai.whylabs.core.configV3.structure.Analyzer;
import ai.whylabs.core.configV3.structure.Analyzers.StddevConfig;
import ai.whylabs.core.predicatesV3.validation.ValidAnalyzerMetric;
import ai.whylabs.core.predicatesV3.validation.ValidAnalyzerThreshold;
import org.testng.annotations.Test;

public class TestValidations {

  @Test
  public void testValidAnalyzerMetric() {
    assertFalse(
        new ValidAnalyzerMetric()
            .test(
                Analyzer.builder()
                    .config(StddevConfig.builder().metric("invalidMetric").build())
                    .build()));
    assertTrue(
        new ValidAnalyzerMetric()
            .test(
                Analyzer.builder()
                    .config(StddevConfig.builder().metric("median").build())
                    .build()));
    assertTrue(
        new ValidAnalyzerMetric()
            .test(
                Analyzer.builder()
                    .config(StddevConfig.builder().metric("classification.f1").build())
                    .build()));
  }

  @Test
  public void testValidThreshold() {
    assertTrue(
        new ValidAnalyzerThreshold()
            .test(
                Analyzer.builder()
                    .config(
                        StddevConfig.builder().maxUpperThreshold(.9).minLowerThreshold(.1).build())
                    .build()));
    assertTrue(
        new ValidAnalyzerThreshold()
            .test(
                Analyzer.builder()
                    .config(StddevConfig.builder().minLowerThreshold(.1).build())
                    .build()));
    assertTrue(
        new ValidAnalyzerThreshold()
            .test(
                Analyzer.builder()
                    .config(StddevConfig.builder().maxUpperThreshold(.9).build())
                    .build()));
    /* TODO: Re-enable once we redo ValidAnalyzerThreshold
    assertFalse(
        new ValidAnalyzerThreshold()
            .test(
                Analyzer.builder()
                    .config(
                        StddevConfig.builder().maxUpperThreshold(.5).minLowerThreshold(1.0).build())
                    .build()));
                    */

  }
}

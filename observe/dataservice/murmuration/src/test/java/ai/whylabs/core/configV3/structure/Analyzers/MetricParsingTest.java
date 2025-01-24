package ai.whylabs.core.configV3.structure.Analyzers;

import static org.testng.AssertJUnit.assertNotNull;

import ai.whylabs.core.configV3.structure.enums.AnalysisMetric;
import org.testng.annotations.Test;

public class MetricParsingTest {

  @Test
  public void testCaseSensitivity() {
    assertNotNull(AnalysisMetric.fromName("MEDIAN"));
    assertNotNull(AnalysisMetric.fromName("median"));
  }
}

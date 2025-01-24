package ai.whylabs.dataservice.models.metrics;

import ai.whylabs.dataservice.metrics.spec.Metric;
import ai.whylabs.dataservice.metrics.spec.NumericMetric;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;

class NumericMetricTest {
  @Test
  public void testJson() throws Exception {
    val spec = new NumericMetric();
    ObjectMapper mapper = new ObjectMapper();
    String result = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(spec);
    System.out.println(result);
    val res = mapper.readerFor(Metric.class).readValue(result);
    System.out.println(res);
  }
}

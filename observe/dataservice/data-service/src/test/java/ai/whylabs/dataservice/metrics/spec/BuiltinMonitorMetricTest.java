package ai.whylabs.dataservice.metrics.spec;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.ValueInstantiationException;
import lombok.SneakyThrows;
import org.hamcrest.CoreMatchers;
import org.junit.jupiter.api.Test;

class BuiltinMonitorMetricTest {
  static ObjectMapper mapper = new ObjectMapper();

  @Test
  void testDeserializationErrors() {
    ValueInstantiationException exception =
        assertThrows(
            ValueInstantiationException.class,
            () -> mapper.readValue("\"bogus_metric\"", BuiltinMonitorMetric.class));
    // assert bogus metric name was detected.
    assertThat(
        exception.getMessage(), CoreMatchers.containsString("Unrecognized builtin monitor metric"));
    // assert message included offending string.
    assertThat(exception.getMessage(), CoreMatchers.containsString("bogus_metric"));
    // assert message lists valid metrics.
    assertThat(exception.getMessage(), CoreMatchers.containsString("anomaly_count"));
  }

  @SneakyThrows
  @Test
  void testHappyPath() {
    assertEquals(
        mapper.readValue("\"max_drift\"", BuiltinMonitorMetric.class),
        BuiltinMonitorMetric.max_drift);
    assertEquals(
        mapper.readValue("\"min_diff\"", BuiltinMonitorMetric.class),
        BuiltinMonitorMetric.min_diff);

    // there are no aliases to test...
  }
}

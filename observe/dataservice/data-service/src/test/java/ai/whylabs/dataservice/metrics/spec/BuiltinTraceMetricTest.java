package ai.whylabs.dataservice.metrics.spec;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.ValueInstantiationException;
import lombok.SneakyThrows;
import org.hamcrest.CoreMatchers;
import org.junit.jupiter.api.Test;

class BuiltinTraceMetricTest {

  static ObjectMapper mapper = new ObjectMapper();

  @Test
  void testDeserializationErrors() {
    ValueInstantiationException exception =
        assertThrows(
            ValueInstantiationException.class,
            () -> mapper.readValue("\"bogus_metric\"", BuiltinTraceMetric.class));
    // assert bogus metric name was detected.
    assertThat(
        exception.getMessage(), CoreMatchers.containsString("Unrecognized builtin trace metric"));
    // assert message included offending string.
    assertThat(exception.getMessage(), CoreMatchers.containsString("bogus_metric"));
    // assert message lists valid metrics.
    assertThat(exception.getMessage(), CoreMatchers.containsString("total_policy_issues"));
  }

  @SneakyThrows
  @Test
  void testHappyPath() {
    assertEquals(
        mapper.readValue("\"count_traces\"", BuiltinTraceMetric.class),
        BuiltinTraceMetric.count_traces);
    assertEquals(
        mapper.readValue("\"total_policy_issues\"", BuiltinTraceMetric.class),
        BuiltinTraceMetric.total_policy_issues);
    assertEquals(
        mapper.readValue("\"total_blocked\"", BuiltinTraceMetric.class),
        BuiltinTraceMetric.total_blocked);
    assertEquals(
        mapper.readValue("\"total_tokens\"", BuiltinTraceMetric.class),
        BuiltinTraceMetric.total_tokens);
    assertEquals(
        mapper.readValue("\"total_latency_millis\"", BuiltinTraceMetric.class),
        BuiltinTraceMetric.total_latency_millis);
  }
}

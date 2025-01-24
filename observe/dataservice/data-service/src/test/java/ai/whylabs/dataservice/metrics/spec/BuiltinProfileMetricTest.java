package ai.whylabs.dataservice.metrics.spec;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.ValueInstantiationException;
import lombok.SneakyThrows;
import org.hamcrest.CoreMatchers;
import org.junit.jupiter.api.Test;

class BuiltinProfileMetricTest {
  static ObjectMapper mapper = new ObjectMapper();

  @Test
  void testDeserializationErrors() {
    ValueInstantiationException exception =
        assertThrows(
            ValueInstantiationException.class,
            () -> mapper.readValue("\"bogus_metric\"", BuiltinProfileMetric.class));
    // assert bogus metric name was detected.
    assertThat(
        exception.getMessage(), CoreMatchers.containsString("Unrecognized builtin profile metric"));
    // assert message included offending string.
    assertThat(exception.getMessage(), CoreMatchers.containsString("bogus_metric"));
    // assert message lists valid metrics.
    assertThat(exception.getMessage(), CoreMatchers.containsString("count_bool_ratio"));
  }

  @SneakyThrows
  @Test
  void testHappyPath() {
    assertEquals(
        mapper.readValue("\"COUNT_BOOL\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.count_bool);
    assertEquals(
        mapper.readValue("\"count_bool\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.count_bool);
    assertEquals(
        mapper.readValue("\"quantile_99\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.quantile_99);

    // test aliases
    assertEquals(
        mapper.readValue("\"stddev\"", BuiltinProfileMetric.class), BuiltinProfileMetric.std_dev);
    assertEquals(
        mapper.readValue("\"classification.fpr\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.classification_fpr);
    assertEquals(
        mapper.readValue("\"CLASSIFICATION.FPR\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.classification_fpr);
    assertEquals(
        mapper.readValue("\"CLASSIFICATION_AUROC\"", BuiltinProfileMetric.class),
        BuiltinProfileMetric.classification_auc);
  }
}

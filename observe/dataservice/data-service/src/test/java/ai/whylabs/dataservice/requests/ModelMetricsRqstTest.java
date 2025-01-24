package ai.whylabs.dataservice.requests;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;

import ai.whylabs.dataservice.enums.SortOrder;
import org.junit.jupiter.api.Test;

class ModelMetricsRqstTest {

  @Test
  public void givenBuilderWithDefaultValue_ThanDefaultValueIsPresent() {
    ModelMetricsRqst build = ModelMetricsRqst.builder().build();
    assertThat(build.getOrder(), is(SortOrder.asc));
    ModelMetricsRqst pojo = new ModelMetricsRqst();
    assertThat(pojo.getOrder(), is(SortOrder.asc));
  }
}

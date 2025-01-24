package ai.whylabs.dataservice.adhoc;

import static ai.whylabs.dataservice.metrics.agg.BuiltinSpec.*;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import java.util.*;
import javax.inject.Inject;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.Test;

@Slf4j
public class PostgresDataResolverTest {
  @Inject private PostgresDataResolver pgResolver;

  /**
   * Verify that all currently active metrics translate to the expected number of timeseries specs.
   * Note this only tests the translation from analyzer metrics to timeseries spec. Testing the
   * timeseries query is covered in the TimeSeriesMetricService unit tests
   */
  @SneakyThrows
  @Test
  void testActiveMetrics() {
    List<Pair<String, Integer>> datasetMetrics =
        Arrays.asList(
            Pair.of("classification.accuracy", 1),
            Pair.of("classification.auroc", 1),
            Pair.of("classification.f1", 1),
            Pair.of("classification.fpr", 1),
            Pair.of("classification.precision", 1),
            Pair.of("classification.recall", 1),
            Pair.of("missingDatapoint", 1),
            Pair.of("regression.mae", 1),
            Pair.of("regression.mse", 1),
            Pair.of("regression.rmse", 1),
            Pair.of("secondsSinceLastUpload", 1));

    List<Pair<String, Integer>> columnMetrics =
        Arrays.asList(
            Pair.of("MEAN", 1),
            Pair.of("count", 1),
            Pair.of("count_null", 1),
            Pair.of("count_null_ratio", 2),
            Pair.of("frequent_items", 1),
            Pair.of("histogram", 1),
            Pair.of("inferred_data_type", 5),
            Pair.of("max", 1),
            Pair.of("mean", 1),
            Pair.of("median", 1),
            Pair.of("min", 1),
            Pair.of("missingDatapoint", 1),
            Pair.of("quantile_95", 1),
            Pair.of("quantile_99", 1),
            Pair.of("stddev", 1),
            Pair.of("unique_est", 1),
            Pair.of("unique_est_ratio", 2));

    // verify that each column metrics get translated to the expected number of  BuiltinSpecs
    for (val p : columnMetrics) {
      val metric = p.getLeft();
      log.error("testing {}", metric);
      val specs = PostgresDataResolver.getBuiltinColumnSpecs(metric);
      assertThat("column metric spec " + metric, specs, hasSize(equalTo(p.getRight())));
    }

    // verify that each dataset metrics get translated to the expected number of  BuiltinSpecs
    for (val p : datasetMetrics) {
      val metric = p.getLeft();
      log.error("testing {}", metric);
      val specs = PostgresDataResolver.getBuiltinDatasetSpecs(metric, "", "", "");
      assertThat("dataset metric spec " + metric, specs, hasSize(equalTo(p.getRight())));
    }
  }
}

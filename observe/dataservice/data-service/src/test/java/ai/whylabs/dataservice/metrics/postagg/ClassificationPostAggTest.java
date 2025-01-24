package ai.whylabs.dataservice.metrics.postagg;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertNull;

import ai.whylabs.dataservice.metrics.agg.Agg;
import ai.whylabs.dataservice.metrics.result.TimeSeriesResult;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import lombok.val;
import org.junit.jupiter.api.Test;

class ClassificationPostAggTest {

  /*
  Python fragment for generating encoded score matrix seen below,
          import base64
          import matplotlib.pyplot as plt
          import numpy as np
          import pandas as pd
          import whylogs as why

          y_test = np.zeros(1)
          y_test_pred = np.zeros(1)
          y_test_scores = np.zeros(1)

          data = pd.DataFrame({"targets": y_test,
                               "predictions": y_test_pred,
                               "scores": y_test_scores})

          perf_profile = why.log_classification_metrics(
              data=data,
              target_column="targets",
              prediction_column="predictions",
              score_column="scores"
          )

          view = perf_profile.view()
          pm = view.model_performance_metrics

          sm = pm.confusion_matrix.to_protobuf()
          _string = sm.SerializeToString()
          base64_message = base64.b64encode(_string).decode('utf-8')
          print(base64_message)
   */

  /**
   * verify that even if there are no classification metrics in postgres results, post-aggregator
   * still produces results
   */
  @Test
  void testMissingData() {
    ClassificationPostAgg postagg =
        new ClassificationPostAgg(ClassificationPostAgg.NumericMetric.count);

    val row = new Agg.BytesRow();
    row.setTimestamp(1717275600000L);
    row.setLastModified(1717275600000L);

    // test with a properly encoded score matrix
    // Encoded score matrix extracted from python,
    String base64ScoreMetrix = "CgMwLjBSJAoCCAESAggBIhACAg8EAAQIAAAAAAAAAAAAMggBAwMAAB7Mkw==";
    row.setValue(base64ScoreMetrix.getBytes(StandardCharsets.UTF_8));
    TimeSeriesResult results = postagg.extract(Collections.singletonList(row));
    assertThat(results.getData(), hasSize(equalTo(1)));
    assertThat(results.getData().get(0).getValue(), equalTo(1.0));

    // test with a corrupted score matrix.  This will throw an internal exception that is caught.
    String badScoreMetrix = "CgMwLjBSJAoAAQIAAAAAAAAAAAAMggBAwMAAB7Mkw==";
    row.setValue(badScoreMetrix.getBytes(StandardCharsets.UTF_8));
    results = postagg.extract(Collections.singletonList(row));
    // despite the exception. returns one row of results, but the value is null
    assertThat(results.getData(), hasSize(equalTo(1)));
    assertNull(results.getData().get(0).getValue());

    // test with a missing confusion matrix
    row.setValue(null);
    results = postagg.extract(Collections.singletonList(row));
    // returns one row of results, but the value is null
    assertThat(results.getData(), hasSize(equalTo(1)));
    assertNull(results.getData().get(0).getValue());
  }
}

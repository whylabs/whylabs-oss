package ai.whylabs.core.aggregation;

import static org.testng.Assert.*;

import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.QueryResultStructure;
import ai.whylabs.core.utils.ClasspathFileLoader;
import ai.whylabs.core.utils.Constants;
import ai.whylabs.druid.whylogs.modelmetrics.DruidModelMetrics;
import com.google.common.collect.ImmutableMap;
import com.whylogs.core.metrics.ModelMetrics;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;
import org.testng.annotations.Test;

public class ResultPostAggregatorTest {
  @SneakyThrows
  protected String getDruidQuery(String queryFile) {
    return new ClasspathFileLoader().getFileContents(queryFile);
  }

  @Test
  public void testClassificationModelMetrics() {
    val druidQuery = getDruidQuery(Constants.druidMonitorQuery);
    val mm = new ModelMetrics("predict", "target", "score");
    final Map<String, String> MY_MAP =
        ImmutableMap.of(
            "predict", "one",
            "target", "two",
            "score", ".92");
    mm.track(MY_MAP);
    val dmm = new DruidModelMetrics(mm);
    val eRow =
        ExplodedRow.builder()
            .classification(mm.getClassificationMetrics().toProtobuf().build().toByteArray())
            .model_metrics(dmm.toByteArray())
            .build();
    QueryResultStructure result = null;
    try {
      result = new QueryResultStructure(eRow, 0L);
    } catch (Exception e) {
      e.printStackTrace();
    }
    assertNull(result.getColumnName());
    assertNotNull(result.getClassification_recall());
    assertNotNull(result.getClassification_fpr());
    assertNotNull(result.getClassification_precision());
    assertNotNull(result.getClassification_accuracy());
    assertNotNull(result.getClassification_f1());
    assertNull(result.getRegression_mae());
    assertNull(result.getRegression_mse());
    assertNull(result.getRegression_rmse());
  }

  @Test
  public void testRegressionModelMetrics() {
    val druidQuery = getDruidQuery(Constants.druidMonitorQuery);
    val mm = new ModelMetrics("predict", "target");
    final Map<String, Double> MY_MAP =
        ImmutableMap.of(
            "predict", 1.0,
            "target", 2.0);
    mm.track(MY_MAP);
    val dmm = new DruidModelMetrics(mm);
    val eRow =
        ExplodedRow.builder()
            .regression(dmm.getRegressionMetrics().toProtobuf().build().toByteArray())
            .build();
    QueryResultStructure result = null;
    try {
      result = new QueryResultStructure(eRow, 0L);
    } catch (Exception e) {
      e.printStackTrace();
    }
    assertNull(result.getColumnName());
    assertNotNull(result.getRegression());
    assertNull(result.getClassification_recall());
    assertNull(result.getClassification_fpr());
    assertNull(result.getClassification_precision());
    assertNull(result.getClassification_accuracy());
    assertNull(result.getClassification_f1());
    assertNotNull(result.getRegression_mae());
    assertNotNull(result.getRegression_mse());
    assertNotNull(result.getRegression_rmse());
  }
}

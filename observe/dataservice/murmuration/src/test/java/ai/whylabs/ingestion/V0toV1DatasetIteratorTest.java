package ai.whylabs.ingestion;

import static com.whylogs.v0.core.message.ModelType.CLASSIFICATION;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.testng.AssertJUnit.fail;

import ai.whylabs.druid.whylogs.metadata.BinMetadata;
import com.whylogs.v0.core.message.*;
import com.whylogs.v0.core.message.DatasetPropertiesV0;
import java.io.IOException;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.val;
import org.testng.annotations.*;

public class V0toV1DatasetIteratorTest {
  /**
   * verify classification metrics with high number of labels get rejected with specific logging
   * message
   */
  @Test
  public void TestBigClassification() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    BinMetadata binMetadata =
        new BinMetadata("org-0", "model-0", currentTime.toInstant().toEpochMilli(), null, null);
    DatasetPropertiesV0 v0properties = DatasetPropertiesV0.newBuilder().build();
    V1Metadata v1meta = new V1Metadata(v0properties, binMetadata);

    // add 21 labels to classification metric
    List<String> labels =
        IntStream.iterate(0, i -> i + 1)
            .limit(21)
            .mapToObj(Long::toString)
            .collect(Collectors.toList());
    ScoreMatrixMessage scoreMatrix = ScoreMatrixMessage.newBuilder().addAllLabels(labels).build();
    ModelMetricsMessage modelMetrics =
        ModelMetricsMessage.newBuilder()
            .setModelType(CLASSIFICATION)
            .setScoreMatrix(scoreMatrix)
            .build();

    try (val it = new V0toV1DatasetIterator(v1meta, modelMetrics)) {
      // verify iterator is empty
      assertThat(it.hasNext(), is(false));
    } catch (IOException ignored) {
      fail("Unexpected exception ");
    }
  }

  /** verify small classification metrics with 20 or fewer labels are not rejected */
  @Test
  public void TestSmallClassification() {
    val currentTime = ZonedDateTime.parse("2021-09-17T00:00:00Z");
    BinMetadata binMetadata =
        new BinMetadata("org-0", "model-0", currentTime.toInstant().toEpochMilli(), null, null);
    DatasetPropertiesV0 v0properties = DatasetPropertiesV0.newBuilder().build();
    V1Metadata v1meta = new V1Metadata(v0properties, binMetadata);

    // add 20 labels to classification metric
    List<String> labels =
        IntStream.iterate(0, i -> i + 1)
            .limit(20)
            .mapToObj(Long::toString)
            .collect(Collectors.toList());
    ScoreMatrixMessage scoreMatrix = ScoreMatrixMessage.newBuilder().addAllLabels(labels).build();
    ModelMetricsMessage modelMetrics =
        ModelMetricsMessage.newBuilder()
            .setModelType(CLASSIFICATION)
            .setScoreMatrix(scoreMatrix)
            .build();

    try (val it = new V0toV1DatasetIterator(v1meta, modelMetrics)) {
      // verify iterator is NOT empty
      assertThat(it.hasNext(), is(true));
    } catch (IOException ignored) {
      fail("Unexpected exception ");
    }
  }
}

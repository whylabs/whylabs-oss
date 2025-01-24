package ai.whylabs.druid.whylogs.modelmetrics;

import ai.whylabs.druid.whylogs.column.DatasetMetrics;
import com.whylogs.core.metrics.ModelMetrics;
import java.nio.ByteBuffer;
import lombok.val;
import org.apache.druid.data.input.InputRow;
import org.apache.druid.segment.GenericColumnSerializer;
import org.apache.druid.segment.column.ColumnBuilder;
import org.apache.druid.segment.data.GenericIndexed;
import org.apache.druid.segment.serde.ComplexColumnPartSupplier;
import org.apache.druid.segment.serde.ComplexMetricExtractor;
import org.apache.druid.segment.serde.LargeColumnSupportedComplexColumnSerializer;
import org.apache.druid.segment.writeout.SegmentWriteOutMedium;

public class ComplexMetricSerde extends org.apache.druid.segment.serde.ComplexMetricSerde {

  private static final ObjectStrategy STRATEGY = new ObjectStrategy();

  @Override
  public String getTypeName() {
    return DatasetMetrics.MODEL_METRICS;
  }

  @Override
  public org.apache.druid.segment.data.ObjectStrategy getObjectStrategy() {
    return STRATEGY;
  }

  @Override
  public ComplexMetricExtractor getExtractor() {
    return new ComplexMetricExtractor() {
      @Override
      public Class<?> extractedClass() {
        return ModelMetrics.class;
      }

      @Override
      public Object extractValue(final InputRow inputRow, final String metricName) {
        val object = inputRow.getRaw(metricName);
        if (object == null || object instanceof ModelMetrics) {
          return object;
        }

        if (object instanceof String) { // everything is a string during ingestion
          String objectString = (String) object;
          // Autodetection of the input format: empty string, number, or base64 encoded
          // sketch
          // A serialized DoublesSketch, as currently implemented, always has 0 in the
          // first 6 bits.
          // This corresponds to "A" in base64, so it is not a digit
          if (objectString.isEmpty()) {
            return Operations.EMPTY_COLUMN;
          } else {
            return Operations.deserialize(objectString);
          }
        }

        return Operations.deserialize(object);
      }
    };
  }

  @Override
  public void deserializeColumn(final ByteBuffer buffer, final ColumnBuilder builder) {
    final GenericIndexed<DruidModelMetrics> column =
        GenericIndexed.read(buffer, STRATEGY, builder.getFileMapper());
    builder.setComplexColumnSupplier(new ComplexColumnPartSupplier(getTypeName(), column));
  }

  // support large columns
  @Override
  public GenericColumnSerializer<ModelMetrics> getSerializer(
      SegmentWriteOutMedium segmentWriteOutMedium, String column) {
    return LargeColumnSupportedComplexColumnSerializer.create(
        segmentWriteOutMedium, column, this.getObjectStrategy());
  }
}

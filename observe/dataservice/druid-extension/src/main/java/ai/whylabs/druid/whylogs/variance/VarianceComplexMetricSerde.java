package ai.whylabs.druid.whylogs.variance;

import com.whylogs.core.statistics.datatypes.VarianceTracker;
import java.nio.ByteBuffer;
import lombok.val;
import org.apache.druid.data.input.InputRow;
import org.apache.druid.segment.GenericColumnSerializer;
import org.apache.druid.segment.column.ColumnBuilder;
import org.apache.druid.segment.data.GenericIndexed;
import org.apache.druid.segment.data.ObjectStrategy;
import org.apache.druid.segment.serde.ComplexColumnPartSupplier;
import org.apache.druid.segment.serde.ComplexMetricExtractor;
import org.apache.druid.segment.serde.ComplexMetricSerde;
import org.apache.druid.segment.serde.LargeColumnSupportedComplexColumnSerializer;
import org.apache.druid.segment.writeout.SegmentWriteOutMedium;

public class VarianceComplexMetricSerde extends ComplexMetricSerde {

  private static final VarianceObjectStrategy STRATEGY = new VarianceObjectStrategy();

  @Override
  public String getTypeName() {
    return VarianceModule.TYPE_NAME;
  }

  @Override
  public ObjectStrategy<VarianceTracker> getObjectStrategy() {
    return STRATEGY;
  }

  @Override
  public ComplexMetricExtractor getExtractor() {
    return new ComplexMetricExtractor() {
      @Override
      public Class<?> extractedClass() {
        return VarianceTracker.class;
      }

      @Override
      public Object extractValue(final InputRow inputRow, final String metricName) {
        val object = inputRow.getRaw(metricName);
        if (object == null || object instanceof VarianceTracker) {
          return object;
        }

        if (object instanceof String) { // everything is a string during ingestion
          String objectString = (String) object;
          // Autodetection of the input format: empty string, number, or base64 encoded
          // sketch
          // A serialized DoublesSketch, as currently implemented, always has 0 in the
          // first 6 bits.
          // This corresponds to "A" in base64, so it is not a digit
          final Double doubleValue;
          if (objectString.isEmpty()) {
            return VarianceOperations.EMPTY_TRACKER;
          } else {
            return VarianceOperations.deserialize(objectString);
          }
        }

        return VarianceOperations.deserialize(object);
      }
    };
  }

  @Override
  public void deserializeColumn(final ByteBuffer buffer, final ColumnBuilder builder) {
    final GenericIndexed<VarianceTracker> column =
        GenericIndexed.read(buffer, STRATEGY, builder.getFileMapper());
    builder.setComplexColumnSupplier(new ComplexColumnPartSupplier(getTypeName(), column));
  }

  // support large columns
  @Override
  public GenericColumnSerializer getSerializer(
      SegmentWriteOutMedium segmentWriteOutMedium, String column) {
    return LargeColumnSupportedComplexColumnSerializer.create(
        segmentWriteOutMedium, column, this.getObjectStrategy());
  }
}

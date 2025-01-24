package ai.whylabs.druid.whylogs.frequency;

import ai.whylabs.druid.whylogs.WhylogsExtensionsModule;
import java.nio.ByteBuffer;
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

public class FrequencyComplexMetricSerde extends ComplexMetricSerde {

  private static final FrequencyObjectStrategy STRATEGY = new FrequencyObjectStrategy();

  @Override
  public String getTypeName() {
    return WhylogsExtensionsModule.FREQUENCY;
  }

  @Override
  public ObjectStrategy<StringItemSketch> getObjectStrategy() {
    return STRATEGY;
  }

  @Override
  public ComplexMetricExtractor getExtractor() {
    return new ComplexMetricExtractor() {
      @Override
      public Class<?> extractedClass() {
        return StringItemSketch.class;
      }

      @Override
      public Object extractValue(final InputRow inputRow, final String metricName) {
        final Object object = inputRow.getRaw(metricName);
        if (object == null || object instanceof StringItemSketch) {
          return object;
        }

        if (object instanceof String) { // everything is a string during ingestion
          String objectString = (String) object;
          if (objectString.isEmpty()) {
            return FrequencyOperations.EMPTY_COLUMN;
          } else {
            return FrequencyOperations.deserialize(objectString);
          }
        }
        return FrequencyOperations.deserialize(object);
      }
    };
  }

  @Override
  public void deserializeColumn(final ByteBuffer buffer, final ColumnBuilder builder) {
    final GenericIndexed<StringItemSketch> column =
        GenericIndexed.read(buffer, STRATEGY, builder.getFileMapper());
    builder.setComplexColumnSupplier(new ComplexColumnPartSupplier(getTypeName(), column));
  }

  // support large columns
  @Override
  public GenericColumnSerializer<StringItemSketch> getSerializer(
      SegmentWriteOutMedium segmentWriteOutMedium, String column) {
    return LargeColumnSupportedComplexColumnSerializer.create(
        segmentWriteOutMedium, column, this.getObjectStrategy());
  }
}

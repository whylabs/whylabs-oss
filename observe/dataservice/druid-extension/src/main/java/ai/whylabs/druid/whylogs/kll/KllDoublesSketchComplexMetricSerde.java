package ai.whylabs.druid.whylogs.kll;

import com.google.common.primitives.Doubles;
import com.shaded.whylabs.org.apache.datasketches.kll.KllDoublesSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
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

public class KllDoublesSketchComplexMetricSerde extends ComplexMetricSerde {

  private static final KllDoublesSketchObjectStrategy STRATEGY =
      new KllDoublesSketchObjectStrategy();

  @Override
  public String getTypeName() {
    return KllDoublesSketchModule.KLL_SKETCH;
  }

  @Override
  public ObjectStrategy<KllDoublesSketch> getObjectStrategy() {
    return STRATEGY;
  }

  @Override
  public ComplexMetricExtractor getExtractor() {
    return new ComplexMetricExtractor() {
      private static final int MIN_K = 2; // package one input value into the smallest sketch

      @Override
      public Class<?> extractedClass() {
        return KllDoublesSketch.class;
      }

      @Override
      public Object extractValue(final InputRow inputRow, final String metricName) {
        final Object object = inputRow.getRaw(metricName);
        if (object instanceof String) { // everything is a string during ingestion
          String objectString = (String) object;
          // Autodetection of the input format: empty string, number, or base64 encoded sketch
          // A serialized KllDoublesSketch, as currently implemented, always has 0 in the first 6
          // bits.
          // This corresponds to "A" in base64, so it is not a digit
          final Double doubleValue;
          if (objectString.isEmpty()) {
            return KllDoublesSketchOperations.EMPTY_SKETCH;
          } else if (Doubles.tryParse(objectString) != null) {
            throw new RuntimeException("found double where kllsketch expected.");
          }
        }

        if (object == null || object instanceof KllDoublesSketch || object instanceof Memory) {
          return object;
        }
        return KllDoublesSketchOperations.deserialize(object);
      }
    };
  }

  @Override
  public void deserializeColumn(final ByteBuffer buffer, final ColumnBuilder builder) {
    final GenericIndexed<KllDoublesSketch> column =
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

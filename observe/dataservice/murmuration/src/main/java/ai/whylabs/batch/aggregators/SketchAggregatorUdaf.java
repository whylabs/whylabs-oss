package ai.whylabs.batch.aggregators;

import ai.whylabs.core.query.DruidQueryParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.function.Function;
import lombok.SneakyThrows;
import org.apache.druid.query.aggregation.AggregatorFactory;
import org.apache.spark.sql.Encoder;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.expressions.Aggregator;

/** Generic aggregator UDAF for sketch based aggregators */
public class SketchAggregatorUdaf extends Aggregator<byte[], byte[], byte[]> {

  private transient AggregatorFactory aggregator;
  private String druidQuery;
  private int aggregatorPosition;
  private transient Function<Object, byte[]> serializer;

  public SketchAggregatorUdaf(String druidQuery, int aggregatorPosition)
      throws JsonProcessingException {
    this.druidQuery = druidQuery;
    this.aggregatorPosition = aggregatorPosition;
  }

  @SneakyThrows
  private void init() {
    if (aggregator == null || serializer == null) {
      DruidQueryParser queryParser = new DruidQueryParser(druidQuery);
      this.aggregator = queryParser.getSketchAggregators().get(aggregatorPosition);
      serializer = queryParser.getSketchSerializer(this.aggregator);
    }
  }

  @SneakyThrows
  private AggregatorFactory getAggregator() {
    init();
    return aggregator;
  }

  private Function<Object, byte[]> getSerializer() {
    init();
    return serializer;
  }

  public String getName() {
    return getAggregator().getName();
  }

  @Override
  public byte[] zero() {
    return new byte[0];
  }

  @SneakyThrows
  @Override
  public byte[] reduce(byte[] a, byte[] b) {
    if (b == null || b.length == 0) {
      return a;
    }
    if (a == null || a.length == 0) {
      return b;
    }
    Object combined =
        getAggregator().combine(getAggregator().deserialize(a), getAggregator().deserialize(b));
    return getSerializer().apply(combined);
  }

  @Override
  public byte[] merge(byte[] a, byte[] b) {
    if (b == null || b.length == 0) {
      return a;
    }
    if (a == null || a.length == 0) {
      return b;
    }

    return getSerializer()
        .apply(
            getAggregator()
                .combine(getAggregator().deserialize(a), getAggregator().deserialize(b)));
  }

  @Override
  public byte[] finish(byte[] reduction) {
    if (reduction == null || reduction.length == 0) {
      return reduction;
    }
    Object finalizedComputation =
        getAggregator().finalizeComputation(getAggregator().deserialize(reduction));
    if (finalizedComputation instanceof Double) {
      // Special case for HLL sketches where the finalized computation is the unique count rather
      // than the sketch byte[]. We'll let the post aggregators take care of sketch->double.
      return reduction;
    } else {
      return getSerializer().apply(finalizedComputation);
    }
  }

  @Override
  public Encoder<byte[]> bufferEncoder() {
    return Encoders.BINARY();
  }

  @Override
  public Encoder<byte[]> outputEncoder() {
    return Encoders.BINARY();
  }
}

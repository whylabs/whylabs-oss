package ai.whylabs.whylogsv1.metrics;

import com.shaded.whylabs.com.google.protobuf.ByteString;

public class Hll extends WhyLogMetric implements WithRawRepresentation<ByteString> {

  final ByteString unparsed;

  public Hll(String columnName, ByteString unparsed) {
    super(columnName);
    this.unparsed = unparsed;
  }

  public Object getHll() {
    // TODO(Jakob): Implement
    throw new IllegalStateException("Need to implement");
  }

  @Override
  public ByteString getRawRepresentation() {
    return unparsed;
  }

  public String toString() {
    return "Hll{" + "ColumnName='" + ColumnName + "'}";
  }
}

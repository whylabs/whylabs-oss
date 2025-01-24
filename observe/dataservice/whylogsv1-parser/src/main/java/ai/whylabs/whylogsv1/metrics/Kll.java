package ai.whylabs.whylogsv1.metrics;

import com.shaded.whylabs.com.google.protobuf.ByteString;

public class Kll extends WhyLogMetric implements WithRawRepresentation<ByteString> {

  final ByteString unparsed;

  public Kll(String columnName, ByteString unparsed) {
    super(columnName);
    this.unparsed = unparsed;
  }

  public Object getKll() {
    // TODO(Jakob): Implement
    throw new IllegalStateException("Need to implement");
  }

  @Override
  public ByteString getRawRepresentation() {
    return unparsed;
  }

  public String toString() {
    return "Kll{" + "ColumnName='" + ColumnName + "'}";
  }
}

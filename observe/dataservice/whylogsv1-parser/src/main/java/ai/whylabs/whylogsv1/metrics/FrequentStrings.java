package ai.whylabs.whylogsv1.metrics;

import com.shaded.whylabs.com.google.protobuf.ByteString;

public class FrequentStrings extends WhyLogMetric implements WithRawRepresentation<ByteString> {

  private final int MAX_ITEMS = 12;

  private final ByteString unparsed;

  public FrequentStrings(String columnName, ByteString unparsed) {
    super(columnName);
    this.unparsed = unparsed;
  }

  public Object getFrequentStrings() {
    // TODO(Jakob): Implement
    throw new IllegalStateException("Need to implement");
  }

  @Override
  public String toString() {
    return "FrequentStrings{" + "ColumnName='" + ColumnName + "'}";
  }

  @Override
  public ByteString getRawRepresentation() {
    return unparsed;
  }
}

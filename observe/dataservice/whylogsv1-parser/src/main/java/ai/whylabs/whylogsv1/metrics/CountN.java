package ai.whylabs.whylogsv1.metrics;

import java.util.Objects;

public class CountN extends WhyLogMetric {

  private final long n;

  public CountN(String columnName, long n) {
    super(columnName);
    this.n = n;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    if (!super.equals(o)) {
      return false;
    }
    CountN countN = (CountN) o;
    return n == countN.n;
  }

  @Override
  public int hashCode() {
    return Objects.hash(super.hashCode(), n);
  }

  @Override
  public String toString() {
    return "CountN{" + "ColumnName='" + ColumnName + '\'' + ", n=" + n + '}';
  }
}

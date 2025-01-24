package ai.whylabs.whylogsv1.metrics;

import static ai.whylabs.whylogsv1.util.SuperSimpleInternalMetrics.METRICS;

import java.util.Objects;
import java.util.Optional;

public class Variance extends WhyLogMetric {

  public static class VarianceBuilder {
    private Long count = null;
    private Double sum = null;
    private Double mean = null;

    public VarianceBuilder() {}

    private void shouldBeNull(Object object) {
      if (object != null) {
        throw new IllegalStateException("Should only be able to set this once.");
      }
    }

    public void setCount(Long count) {
      shouldBeNull(this.count);
      this.count = count;
    }

    public void setSum(Double sum) {
      shouldBeNull(this.sum);
      this.sum = sum;
    }

    public void setMean(Double mean) {
      shouldBeNull(this.mean);
      this.mean = mean;
    }

    public Optional<Variance> squashVarianceComponents(String columnName) {
      // TODO: Figure out why this supported in the code
      // We picked up part of the variance definition via a counts/n, but not the rest of the
      // fields...
      if (count != null && sum == null && mean == null) {
        return Optional.empty();
      }
      if (count == null && sum == null && mean == null) {
        // No variance included here, nothing to do.
        return Optional.empty();
      }

      if (count == null || sum == null || mean == null) {
        throw new IllegalStateException(
            String.format(
                "Not all components necessary for Variance were provided. Count = %d, Sum = %d, Mean = %d",
                count, sum, mean));
      }

      METRICS().increment("metric_for_variance");
      return Optional.of(new Variance(columnName, count, sum, mean));
    }
  }

  private final long count;
  private final double sum;
  private final double mean;

  public Variance(String columnName, long count, double sum, double mean) {
    super(columnName);
    this.count = count;
    this.sum = sum;
    this.mean = mean;
  }

  // Should we have a vector getter here as well?

  public long getCount() {
    return count;
  }

  public double getSum() {
    return sum;
  }

  public double getMean() {
    return mean;
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
    Variance variance = (Variance) o;
    return count == variance.count
        && Double.compare(variance.sum, sum) == 0
        && Double.compare(variance.mean, mean) == 0;
  }

  @Override
  public int hashCode() {
    return Objects.hash(super.hashCode(), count, sum, mean);
  }

  @Override
  public String toString() {
    return "Variance{"
        + "ColumnName='"
        + ColumnName
        + '\''
        + ", count="
        + count
        + ", sum="
        + sum
        + ", mean="
        + mean
        + '}';
  }
}

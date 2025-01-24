package ai.whylabs.whylogsv1.metrics;

import java.util.Objects;

public class TypeCount extends WhyLogMetric {

  private final String name;
  private final long count;

  public TypeCount(String columnName, String name, long count) {
    super(columnName);
    this.name = name;
    this.count = count;
  }

  public String getName() {
    return name;
  }

  public long getCount() {
    return count;
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
    TypeCount typeCount = (TypeCount) o;
    return count == typeCount.count && name.equals(typeCount.name);
  }

  @Override
  public int hashCode() {
    return Objects.hash(super.hashCode(), name, count);
  }

  @Override
  public String toString() {
    return "TypeCount{"
        + "ColumnName='"
        + ColumnName
        + '\''
        + ", name='"
        + name
        + '\''
        + ", count="
        + count
        + '}';
  }
}

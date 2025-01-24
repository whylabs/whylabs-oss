package ai.whylabs.whylogsv1.metrics;

/**
 * Represents something can be represented in one form but we want to keep it around in another form
 * as well, likely because that raw form is expensive or impossible to create or process.
 *
 * <p>For example, we may have some value we want to keep the serialized byte array version of so
 * that we can hand that off somewhere later.
 *
 * @param <T>
 */
public interface WithRawRepresentation<T> {
  public T getRawRepresentation();
}

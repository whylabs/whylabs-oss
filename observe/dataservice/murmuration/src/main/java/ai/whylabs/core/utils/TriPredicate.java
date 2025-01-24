package ai.whylabs.core.utils;

import java.util.Objects;

/**
 * A {@link java.util.function.Predicate} which provides 3 input arguments.
 *
 * @see java.util.function.BiPredicate
 * @since 1.0.0
 */
@FunctionalInterface
public interface TriPredicate<P1, P2, P3> {
  boolean test(P1 p1, P2 p2, P3 p3);

  default TriPredicate<P1, P2, P3> and(TriPredicate<? super P1, ? super P2, ? super P3> other) {
    Objects.requireNonNull(other);
    return (P1 p1, P2 p2, P3 p3) -> test(p1, p2, p3) && other.test(p1, p2, p3);
  }

  default TriPredicate<P1, P2, P3> negate() {
    return (P1 p1, P2 p2, P3 p3) -> !test(p1, p2, p3);
  }

  default TriPredicate<P1, P2, P3> or(TriPredicate<? super P1, ? super P2, ? super P3> other) {
    Objects.requireNonNull(other);
    return (P1 p1, P2 p2, P3 p3) -> test(p1, p2, p3) || other.test(p1, p2, p3);
  }
}

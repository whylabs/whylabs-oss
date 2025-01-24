package ai.whylabs.adhoc.resolvers;

import java.util.*;
import org.joda.time.Interval;

/** Merge overlapping intervals */
public class IntervalCollapser {

  public static List<Interval> merge(List<Interval> i) {

    List<Interval> intervals = new LinkedList();
    intervals.addAll(i);
    intervals.sort(Comparator.comparing(Interval::getStartMillis));

    LinkedList<Interval> merged = new LinkedList<>();
    for (Interval interval : intervals) {
      int previousPosition = merged.size() - 1;
      if (merged.isEmpty()) {
        merged.add(interval);
      } else if (merged.get(previousPosition).getEndMillis() >= interval.getStartMillis()) {
        // There was overlap, extend the end time on previous interval
        merged.set(
            previousPosition,
            new Interval(
                merged.get(previousPosition).getStartMillis(),
                Math.max(interval.getEndMillis(), merged.get(previousPosition).getEndMillis())));
      } else {
        // No overlap, just add it
        merged.add(interval);
      }
    }
    return merged;
  }
}

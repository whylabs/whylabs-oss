package ai.whylabs.dataservice.cache;

import ai.whylabs.dataservice.requests.BaseRequest;
import ai.whylabs.dataservice.requests.ProfileRollupRequest;
import ai.whylabs.dataservice.strategies.ProfileTableResolutionStrategy;

/**
 * There is a bit of overhead to checking if cache hits were stale. It's cheap on expensive queries,
 * but for very narrow queries where our indexes are kicking butt, it's not worth the overhead. This
 * class plucks out those scenarios.
 */
public class CacheStrategy {
  private static final long cutoff = 30;

  /** Is this query so kind to our database that it's pointless to cache it? */
  public static boolean skipCache(BaseRequest r) {
    if (r.getClass().isAssignableFrom(ProfileRollupRequest.class)) {
      ProfileRollupRequest request = (ProfileRollupRequest) r;
      if (ProfileTableResolutionStrategy.isSegmented(
          request.getSegment(), request.getSegmentKey())) {
        // All segmented table hits should be cached as they're more expensive than overall queries
        return false;
      }
      long days = request.getInterval().toDuration().getStandardDays();

      if (request.getColumnNames() != null
          && request.getColumnNames().size() == 1
          && days < cutoff) {
        // Single column on the overall table, <30d interval, we can skip the cache overhead on this
        // one
        return true;
      }
    }
    return false;
  }
}

package ai.whylabs.dataservice.util;

import com.google.common.hash.HashFunction;
import com.google.common.hash.Hashing;
import com.google.common.util.concurrent.Striped;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.locks.Lock;

/**
 * In Postgres any operation that writes/deletes/updates data will obtain a bunch of row locks which
 * you can see in realtime running pg_top on the database primary. Sometimes PG figures it out and
 * other times the queries deadlock each other until one of them times out. This class helps
 * dataservice-backfill add some locking around those operations to ensure they're not operating on
 * the same dataset concurrently.
 */
public class ConcurrencyUtils {
  private static final int NUM_LOCKS = 1000;
  private static final Striped<Lock> lock = Striped.lock(NUM_LOCKS);
  private static final HashFunction hf = Hashing.md5();

  private static Long hash(String orgId, String datasetId, Scope scope) {
    return hf.newHasher()
        .putString(orgId, StandardCharsets.UTF_8)
        .putString(datasetId, StandardCharsets.UTF_8)
        .putString(scope.name(), StandardCharsets.UTF_8)
        .hash()
        .asLong();
  }

  public static enum Scope {
    overall,
    segmented,
    both
  }

  public static String getLockSql(String orgId, String datasetId, Scope scope) {
    switch (scope) {
      case overall:
        return "select pg_advisory_xact_lock(" + hash(orgId, datasetId, scope) + ")";
      case segmented:
        return "select pg_advisory_xact_lock(" + hash(orgId, datasetId, scope) + ")";
      case both:
        return "select pg_advisory_xact_lock("
            + hash(orgId, datasetId, Scope.segmented)
            + "), pg_advisory_xact_lock("
            + hash(orgId, datasetId, Scope.overall)
            + ") ";
    }
    throw new RuntimeException("Unsupported scope " + scope);
  }
}

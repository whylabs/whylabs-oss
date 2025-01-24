package ai.whylabs.dataservice.util;

import ai.whylabs.dataservice.enums.DataGranularity;
import ai.whylabs.dataservice.exceptions.DowntimeWindowException;
import ai.whylabs.dataservice.services.GlobalStatusService;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.google.common.collect.Sets;
import java.util.List;
import javax.ws.rs.BadRequestException;
import javax.ws.rs.NotAcceptableException;
import org.apache.commons.lang3.StringUtils;
import org.joda.time.DateTime;
import org.joda.time.Interval;

public class ValidateRequest {
  public static final int MAX_PAGE_SIZE = 10000;
  public static final int MAX_OFFSET = 100000;
  public static final int MAX_FILTER_ELEMENTS = 100;

  public static void checkMaintenanceWindow(
      Interval interval, GlobalStatusService globalStatusService) {
    if (!globalStatusService.isMaintenanceWindow()) {
      return;
    }

    if (new DateTime().minusDays(90).isBefore(interval.getEnd())) {
      throw new DowntimeWindowException(
          "Query interval attempting to retrieve older data currently in a downtime window. Check back later or focus efforts on data <90 days old.");
    }
  }

  public static void checkLimitOffset(Integer limit, Integer offset) {
    // should not happen; all our requests have default values for these fields.
    if (limit == null || offset == null) {
      throw new IllegalArgumentException("Limit and offset must be non-null.");
    }
    if (limit > MAX_PAGE_SIZE) {
      throw new IllegalArgumentException("Limit cannot exceed max page size " + MAX_PAGE_SIZE);
    }
    if (offset > MAX_OFFSET) {
      throw new IllegalArgumentException(
          "Offset cannot exceed max number of pages. Rest APIs are a rather inefficient manner of moving bulk data. Please use the datalake for bulk access."
              + MAX_OFFSET);
    }
    if (limit < 0 || offset < 0) {
      throw new IllegalArgumentException("Limit and offset must both be greater than zero.");
    }
  }

  public static void checkFilterListSize(List l, String fieldname) {
    if (l != null && l.size() > MAX_FILTER_ELEMENTS) {
      throw new IllegalArgumentException(
          fieldname + " cannot exceed " + MAX_FILTER_ELEMENTS + " elements");
    }
  }

  public static void checkParquetSnapshot(ListObjectsV2Result res, String path) {
    if (res.isTruncated()) {
      throw new NotAcceptableException("Too many files in the path: " + path);
    }

    if (res.getObjectSummaries().size() == 0) {
      throw new BadRequestException("No entries found under the S3 URI: " + path);
    }
  }

  public static void checkNotNull(Object o, String fieldname) {
    if (o == null) {
      throw new IllegalArgumentException(fieldname + " cannot be null");
    }
  }

  public static void checkDisjoint(List l1, List l2, String fieldname) {
    if (l1 == null || l2 == null) return;
    boolean disjoint = Sets.intersection(Sets.newHashSet(l1), Sets.newHashSet(l2)).isEmpty();
    if (!disjoint) {
      throw new IllegalArgumentException(fieldname + " lists must be disjoint");
    }
  }

  public static void checkTooGranular(Interval interval, DataGranularity granularity) {
    if (granularity == null) {
      return;
    }
    long d = interval.toDuration().getStandardDays();
    switch (granularity) {
      case hourly:
        if (d > 180) {
          throw new IllegalArgumentException(
              "Query too granular ("
                  + granularity
                  + ") for such a wide interval ("
                  + interval
                  + "). Either shrink the interval or shrink the granularity.");
        }
        break;
      case daily:
        if (d > 365 * 5) {
          throw new IllegalArgumentException(
              "Query too granular ("
                  + granularity
                  + ") for such a wide interval ("
                  + interval
                  + "). Either shrink the interval or shrink the granularity.");
        }
        break;
    }
  }

  public static void checkDebugEventIntervalTooWide(Interval interval) {
    long d = interval.toDuration().getStandardDays();
    if (d > 7) {
      throw new IllegalArgumentException(
          "Query interval too wide, choose something more narrow than a week" + interval);
    }
  }

  public static void checkGranularTableQuery(
      Interval interval, DataGranularity granularity, String traceId, List<String> columns) {
    if (granularity == null) {
      return;
    }
    if (granularity.equals(DataGranularity.individual) && StringUtils.isEmpty(traceId)) {
      long d = interval.toDuration().getStandardDays();
      IllegalArgumentException ex =
          new IllegalArgumentException(
              "Query too granular ("
                  + granularity
                  + ") for such a wide interval against the granular profile table ("
                  + interval
                  + "). Either shrink the interval, shrink the granularity, or specify traceId. You may want to use a rollup query to figure out where data is before zooming in to this level of detail");

      if (columns.size() == 1 && d > 31) {
        // We're more generous on the interval size if they're querying a single column name
        throw ex;
      } else if (d > 1) {
        throw ex;
      }
    }
  }
}

package ai.whylabs.dataservice.tokens;

import ai.whylabs.core.granularity.ComputeJobGranularities;
import ai.whylabs.dataservice.requests.ProfileRollupRequest;
import ai.whylabs.dataservice.requests.SegmentTag;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;
import lombok.val;
import org.joda.time.Interval;

@Data
@Builder
public class RetrievalTokenV1 implements RetrievalToken {
  private String traceId;
  private Long profileId;
  private Interval interval;
  private List<SegmentTag> segmentTags;
  private int version = 1;

  @Override
  public void apply(ProfileRollupRequest req) {
    if (traceId != null && req.getTraceId() == null) {
      req.setTraceId(traceId);
    }
    if (profileId != null && req.getProfileId() == null) {
      req.setProfileId(profileId);
    }
    if (interval != null && req.getInterval() == null) {
      // Truncate by query granularity so we don't miss anything
      val ts =
          ZonedDateTime.ofInstant(Instant.ofEpochMilli(interval.getStartMillis()), ZoneOffset.UTC);
      val g = req.getGranularity().asMonitorGranularity();
      val startOfTargetBatch = ComputeJobGranularities.truncateTimestamp(ts, g);
      val endOfTargetBatch = ComputeJobGranularities.add(startOfTargetBatch, g, 1);
      req.setInterval(
          new Interval(
              startOfTargetBatch.toInstant().toEpochMilli(),
              endOfTargetBatch.toInstant().toEpochMilli()));
    }
    if (segmentTags != null && req.getSegment() == null) {
      req.setSegment(segmentTags);
    }
  }
}

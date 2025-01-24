package ai.whylabs.druid.whylogs.operationalMetrics;

import ai.whylabs.druid.whylogs.column.ProfileMetrics;
import ai.whylabs.druid.whylogs.column.WhyLogsMetrics;
import ai.whylabs.druid.whylogs.discrete.DiscretePostAggregator;
import ai.whylabs.druid.whylogs.schematracker.InferredTypePostAggregator;
import com.shaded.whylabs.org.apache.datasketches.hll.HllSketch;
import com.shaded.whylabs.org.apache.datasketches.memory.Memory;
import com.whylogs.v0.core.message.InferredType.Type;
import java.util.*;
import java.util.stream.Stream;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

@Getter
@Slf4j
public class EntitySchemaInstrumentationImpl implements EntitySchemaInstrumentation {

  private final Map<String, Metadata> columnMetadata = new HashMap();

  @Override
  public void instrument(WhyLogsMetrics next) {
    try {
      if (columnMetadata.size() > 100 * 1000) {
        /**
         * Absolutely should never happen b/c no profile should have so many columns, but this gives
         * us some OOM protection in the event of a bug
         */
        columnMetadata.clear();
        log.error("Unbounded growth on columnMetadata, this is a bug");
      }

      // collect metadata for all profiles, even those containing only dataset metrics
      if (next.getClass().isAssignableFrom(ProfileMetrics.class)) {

        val profileMetric = (ProfileMetrics) next;
        if (StringUtils.isEmpty(profileMetric.getColProfile().getColumnName())) {
          return;
        }

        if (columnMetadata.containsKey(profileMetric.getColProfile().getColumnName())) {
          return;
        }

        val metadata = Metadata.builder();

        // This is oldschool whylogs, when V1 launches a more formalized way to know direction we
        // should
        // switch to that and keep this as a fallback for legacy uploads
        metadata.direction(profileMetric.getDirection());

        val typeCounts = profileMetric.getColProfile().getSchemaTracker().getTypeCounts();
        Type type = null;
        if (typeCounts != null && typeCounts.size() > 0) {
          long nullCount = profileMetric.getMsg().getCounters().getNullCount().getValue();
          type = InferredTypePostAggregator.compute(typeCounts, nullCount).getType();
          metadata.type(type);
        }

        // Infer discrete vs continuous based on this event
        if (profileMetric.getMsg().hasCardinalityTracker()
            && profileMetric.getMsg().getCardinalityTracker().getSketch() != null
            && profileMetric.getMsg().getCardinalityTracker().getSketch().toByteArray() != null
            && profileMetric.getMsg().getCardinalityTracker().getSketch().toByteArray().length > 0
            && profileMetric.getMsg().hasCounters()) {
          HllSketch hll =
              HllSketch.wrap(
                  Memory.wrap(
                      (profileMetric.getMsg().getCardinalityTracker().getSketch().toByteArray())));
          metadata.discrete(
              DiscretePostAggregator.compute(
                  hll, profileMetric.getMsg().getCounters().getCount(), type));
        }
        columnMetadata.put(profileMetric.getColProfile().getColumnName(), metadata.build());
      }
    } catch (Exception e) {
      log.error("Error collecting entity schema information ", e);
    }
  }

  /**
   * Produce a stream of metrics that describe whether a profile ingestion was successful. We'll
   * sink this to druid so we can surface issues in the UI around ingestion.
   *
   * <p>Secondly, do some dataset schema/direction/discrete inference. This gives Songbird an
   * opportunity to collect some schema data as profiles are being streamed in. Notably we won't put
   * the schema stuff into druid, that's just for songbird.
   *
   * <p>Also notably the schema inference stuff doesn't have to happen in Druid, that just happens
   * to be the only managed streaming task we have in place atm. I could totally see moving that
   * part of code into either a lambda function or service of some sort that's fed S3 upload
   * notifications to process.
   */
  @Override
  public Stream<Pair<String, Metadata>> metadataStream() {
    return columnMetadata.entrySet().stream().map(e -> Pair.of(e.getKey(), e.getValue()));
  }
}

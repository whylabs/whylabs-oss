package ai.whylabs.adhoc.resolvers;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.enums.AggregationDataGranularity;
import ai.whylabs.core.predicatesV3.segment.MatchingSegmentFactory;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.core.utils.SegmentUtils;
import com.google.gson.JsonParser;
import java.time.ZonedDateTime;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import lombok.val;

@Slf4j
public class DruidDataResolverV3 implements DataResolverV3 {
  private static final String TIMESTAMP = "timestamp";
  private static final String EVENT = "event";

  @Deprecated
  public List<ExplodedRow> resolveStandardProfiles(AdHocMonitorRequestV3 request) {
    return null;
  }

  @Deprecated
  public List<ExplodedRow> resolveReferenceProfiles(AdHocMonitorRequestV3 request) {
    return null;
  }

  @Override
  public List<AnalyzerResultResponse> resolveAnalyzerResults(AdHocMonitorRequestV3 request) {
    return Collections.emptyList();
  }

  /**
   * Take the result of a druid rollup query and transform it into ExplodedRows which the monitor
   * engine knows how to work with.
   */
  public static List<ExplodedRow> getExplodedRows(AdHocMonitorRequestV3 request, String result) {
    if (result == null) {
      // Legit, not config has a reference profile
      return Collections.emptyList();
    }
    List<ExplodedRow> explodedRows = new ArrayList<>();
    for (val element : JsonParser.parseString(result).getAsJsonArray()) {
      val jso = element.getAsJsonObject();
      String ts = jso.get(TIMESTAMP).getAsString();
      val event = jso.get(EVENT).getAsJsonObject();
      val exploded =
          ExplodedRowParser.fromEvent(
              event,
              request.getMonitorConfig().getOrgId(),
              request.getMonitorConfig().getDatasetId(),
              ZonedDateTime.parse(ts).toInstant().toEpochMilli());
      Double weight =
          MatchingSegmentFactory.getFieldWeight(
              request.getMonitorConfig(),
              ai.whylabs
                  .core
                  .configV3
                  .structure
                  .Segment
                  .builder()
                  .tags(SegmentUtils.parseSegmentV3(exploded.getSegmentText()))
                  .build(),
              exploded.getColumnName());
      exploded.setWeight(weight);

      exploded.setAggregationDataGranularity(AggregationDataGranularity.ROLLED_UP);
      explodedRows.add(exploded);
    }
    return explodedRows;
  }
}

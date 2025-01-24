package ai.whylabs.adhoc.resolvers;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.ExplodedRow;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import java.util.List;

public interface DataResolverV3 {

  List<ExplodedRow> resolveStandardProfiles(AdHocMonitorRequestV3 request);

  List<ExplodedRow> resolveReferenceProfiles(AdHocMonitorRequestV3 request);

  List<AnalyzerResultResponse> resolveAnalyzerResults(AdHocMonitorRequestV3 request);
}

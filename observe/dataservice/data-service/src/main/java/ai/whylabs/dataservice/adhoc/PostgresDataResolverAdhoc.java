package ai.whylabs.dataservice.adhoc;

import ai.whylabs.adhoc.structures.AdHocMonitorRequestV3;
import ai.whylabs.core.structures.monitor.events.AnalyzerResultResponse;
import ai.whylabs.dataservice.metrics.service.TimeSeriesMetricService;
import ai.whylabs.dataservice.services.AnalysisService;
import ai.whylabs.dataservice.services.DatasetMetricsService;
import ai.whylabs.dataservice.services.ProfileService;
import java.util.Collections;
import java.util.List;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
public class PostgresDataResolverAdhoc extends PostgresDataResolver {

  public PostgresDataResolverAdhoc(
      ProfileService profileService,
      DatasetMetricsService datasetMetricsService,
      AnalysisService analysisService,
      TimeSeriesMetricService metricService) {
    super(profileService, datasetMetricsService, analysisService, metricService);
  }

  public List<AnalyzerResultResponse> resolveAnalyzerResults(AdHocMonitorRequestV3 request) {
    // Adhoc monitors don't bother with feedback loop resolving
    return Collections.emptyList();
  }
}

package ai.whylabs.dataservice.adhoc;

import ai.whylabs.dataservice.metrics.service.TimeSeriesMetricService;
import ai.whylabs.dataservice.services.AnalysisService;
import ai.whylabs.dataservice.services.DatasetMetricsService;
import ai.whylabs.dataservice.services.ProfileService;
import javax.inject.Singleton;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
public class PostgresDataResolverPgMonitor extends PostgresDataResolver {

  public PostgresDataResolverPgMonitor(
      ProfileService profileService,
      DatasetMetricsService datasetMetricsService,
      AnalysisService analysisService,
      TimeSeriesMetricService metricService) {
    super(profileService, datasetMetricsService, analysisService, metricService);
  }

  protected boolean readPgMonitor() {
    // When resolving the feedback loop, do so from the pg monitor backed table
    return true;
  }
}

import { TraceDataRangeResponse } from '@whylabs/data-service-node-client';

import {
  AlertCategoryCounts,
  AnalysisResult,
  BatchMetadata,
  DataAvailability,
  FeatureSketch,
  MetricResult,
  MetricValue,
} from '../../../graphql/generated/graphql';
import {
  cancelBackfillAnalyzersJob,
  getAdHocRunNumEvents,
  getBackfillAnalyzersJobStatus,
  getResourceBackfillAnalyzersJobs,
  runAdhocAnalyzers,
  runBackfillAnalyzers,
} from '../data-service/api-wrappers/adhoc';
import {
  filterAnalyzerResults,
  getBatchedAnalyzerResults,
  setFalseAlarm,
} from '../data-service/api-wrappers/analyzer-results';
import { getAnalyzerRunCount, getPaginatedRuns } from '../data-service/api-wrappers/analyzer-runs';
import {
  AnomalyCountBySegmentRequest,
  fetchAnomalyCountsBySegment,
  fetchCategoricalAlertCountsV3,
  filterAnomalyCountsBySegment,
  filterCategoricalAlertCountsV3,
  getAnomalyCount,
} from '../data-service/api-wrappers/anomaly-counts';
import {
  GetSegmentedMetadataRequest,
  fetchSegmentedMetadataForTimeRange,
  filterSegmentedMetadataForTimeRange,
  getBatchDateRange,
  getBatchMetadataForTimeRange,
} from '../data-service/api-wrappers/batch-metadata';
import { getActiveColumns } from '../data-service/api-wrappers/columns';
import { getIndividualSketch, listIndividualProfiles } from '../data-service/api-wrappers/individ-profiles';
import { fetchLatestAnomalies, filterLatestAnomalies } from '../data-service/api-wrappers/latest-anomaly';
import { getDefaultMetricMetadata } from '../data-service/api-wrappers/metric-metadata';
import {
  filterDerivedMetrics,
  getDerivedMetrics,
  getModelMetricsForTimeRange,
  getModelMetricsForTimestamp,
} from '../data-service/api-wrappers/model-metrics';
import {
  filterBatchableNumericMetrics,
  getBatchableNumericMetrics,
  getNumericMetrics,
  getNumericMetricsSegmentRollup,
} from '../data-service/api-wrappers/numeric-metrics';
import {
  filterProfilesByTimeRange,
  getProfilesByTimeRange,
  getProfilesByTimestamp,
  getReferenceSketches,
  singleProfileInsight,
} from '../data-service/api-wrappers/profile-rollup';
import { getSegmentTags, getSegmentedAnomalyCount } from '../data-service/api-wrappers/segments';
import {
  DataAvailabilityRequest,
  filterDataAvailability,
  getDataAvailability,
} from '../data-service/api-wrappers/time-boundary';
import {
  GetBatchableTraceResourcesRequest,
  batchableGetTracesDateRange,
  filterResourcesWithTraces,
} from '../data-service/api-wrappers/traces';
import {
  CategoricalAnomalyCountRequest,
  GetBatchableAnalysisRequest,
  GetLatestAnomalyRequest,
} from '../data-service/queries/analysis-queries';
import { FeatureSketchesRequest } from '../data-service/queries/feature-queries';
import { GetDerivedMetricsRequest } from '../data-service/queries/model-metrics-queries';
import { GetBatchableMetricRequest } from '../data-service/queries/numeric-metrics-queries';
import { WhyLabsDataSource } from './whylabs-data-source';

/**
 * Exposes access to the WhyLabs data service (profiles, anomalies, etc)
 * TODOs:
 * Error handling / retries
 * Caching (not necessarily if using memory cache and dataloaders)
 * Logging
 */
export class DataServiceSource extends WhyLabsDataSource {
  private batchDataAvailability = this.createDataLoader(getDataAvailability, filterDataAvailability);
  private batchProfileRollup = this.createDataLoader(getProfilesByTimeRange, filterProfilesByTimeRange);
  private derivedModelMetrics = this.createDataLoader(getDerivedMetrics, filterDerivedMetrics);
  private batchAnalyzerResults = this.createDataLoader(getBatchedAnalyzerResults, filterAnalyzerResults);
  private categoricalAnomalyCounts = this.createDataLoader(
    fetchCategoricalAlertCountsV3,
    filterCategoricalAlertCountsV3,
  );
  private segmentAnomalyCounts = this.createDataLoader(fetchAnomalyCountsBySegment, filterAnomalyCountsBySegment);
  private batchLatestAnomalies = this.createDataLoader(fetchLatestAnomalies, filterLatestAnomalies);
  private segmentedMetadataForTimeRange = this.createDataLoader(
    fetchSegmentedMetadataForTimeRange,
    filterSegmentedMetadataForTimeRange,
  );
  private batchNumericMetrics = this.createDataLoader(getBatchableNumericMetrics, filterBatchableNumericMetrics);
  private batchTracesDateRange = this.createDataLoader(batchableGetTracesDateRange, filterResourcesWithTraces);

  /**
   * Fetches data availability range for the given org and dataset/segment
   * @param req
   */
  public getDataAvailability = async (req: DataAvailabilityRequest): Promise<DataAvailability> => {
    return this.batchDataAvailability.load(req);
  };

  /**
   * Fetch rolled up (merged) profile data
   * @param req
   */
  public getProfileRollup = async (req: FeatureSketchesRequest): Promise<FeatureSketch[]> =>
    this.batchProfileRollup.load(req);

  /**
   * Fetch profiles for a timestamp
   * @param req
   */
  public getProfilesByTimestamp = this.get(getProfilesByTimestamp);

  /**
   * Fetch insights for a reference profile or time interval
   * @param req
   */
  public singleProfileInsight = this.get(singleProfileInsight);

  /**
   * Fetch derived model metrics
   * @param req
   */
  public getDerivedModelMetrics = async (req: GetDerivedMetricsRequest): Promise<MetricValue[]> =>
    this.derivedModelMetrics.load(req);

  /**
   * Fetch the timestamp of the latest anomaly for the given dataset/model
   * @param req
   */
  public getLatestAnomaly = async (req: GetLatestAnomalyRequest): Promise<number | null> =>
    this.batchLatestAnomalies.load(req);

  /**
   * Fetch model metrics by timestamp
   * @param req
   */
  public getModelMetricsForTimestamp = this.get(getModelMetricsForTimestamp);

  /**
   * Fetch model metrics by time range
   * @param req
   */
  public getModelMetricsForTimeRange = this.get(getModelMetricsForTimeRange);

  /**
   * Get timestamps and input/output counts of available batches within a time range
   * @param req
   */
  public getBatchMetadataForTimeRange = this.get(getBatchMetadataForTimeRange);

  /**
   * Get timestamps and input/output counts of available batches within a time range
   */
  public getSegmentedMetadataForTimeRange = async (req: GetSegmentedMetadataRequest): Promise<BatchMetadata[]> => {
    return this.segmentedMetadataForTimeRange.load(req);
  };

  /**
   * Get batch date range
   */
  public getBatchDateRange = this.get(getBatchDateRange);

  /**
   * Fetch analyzer results
   * @param req
   */
  public getAnalyzerResults = async (req: GetBatchableAnalysisRequest): Promise<AnalysisResult[]> => {
    return this.batchAnalyzerResults.load(req);
  };

  /**
   * Fetch paginated analyzer runs
   * @param req
   */
  public getPaginatedRuns = this.get(getPaginatedRuns);

  /**
   * Fetch analyzer run count
   * @param req
   */
  public getAnalyzerRunCount = this.get(getAnalyzerRunCount);

  /**
   * Gets anomaly and failure counts for the specified dataset and time range
   */
  public getAnomalyCount = this.get(getAnomalyCount);

  /**
   * Get anomaly counts over time, broken down by category
   */
  public getCategoricalAnomalyCounts = async (req: CategoricalAnomalyCountRequest): Promise<AlertCategoryCounts> => {
    return this.categoricalAnomalyCounts.load(req);
  };

  /**
   * Get anomaly counts over time, broken down by category
   */
  public getAnomalyCountsBySegment = async (req: AnomalyCountBySegmentRequest): Promise<AlertCategoryCounts> => {
    return this.segmentAnomalyCounts.load(req);
  };

  /**
   * Get adhoc run number of events
   */
  public getAdHocRunNumEvents = this.get(getAdHocRunNumEvents);

  /**
   * Get sketches for reference profile
   */
  public getReferenceSketches = this.get(getReferenceSketches);

  /**
   * Get anomaly counts for each segment
   */
  public getSegmentedAnomalyCount = this.get(getSegmentedAnomalyCount);

  /**
   * Get segment tags
   */
  public getSegmentTags = this.get(getSegmentTags);

  /**
   * Get numeric metrics for each bucket in a time range
   */
  public getNumericMetrics = this.get(getNumericMetrics);

  public getBatchableNumericMetrics = async (req: GetBatchableMetricRequest): Promise<MetricResult[]> => {
    return this.batchNumericMetrics.load(req);
  };

  /**
   * Get numeric metrics partitioned by segment value rolled up for time range
   */
  public getNumericMetricsSegmentRollup = this.get(getNumericMetricsSegmentRollup);

  /**
   * Run analysis preview job
   */
  public runAdhocAnalyzers = this.get(runAdhocAnalyzers);

  /**
   * Run analyzers backfill job
   */
  public runBackfillAnalyzers = this.get(runBackfillAnalyzers);

  /**
   * Cancel analyzers backfill job
   */
  public cancelBackfillAnalyzersJob = this.get(cancelBackfillAnalyzersJob);

  /**
   * Get status of an analyzers backfill job
   */
  public getBackfillAnalyzersJobStatus = this.get(getBackfillAnalyzersJobStatus);

  /**
   * Get list of backfill jobs for a dataset
   */
  public getResourceBackfillAnalyzersJobs = this.get(getResourceBackfillAnalyzersJobs);

  /**
   * Set or unset an analysis result as being a false alarm
   */
  public setFalseAlarm = this.get(setFalseAlarm);

  /**
   * List the individual profiles in a time range
   */
  public listIndividualProfiles = this.get(listIndividualProfiles);

  /**
   * Get individual profile
   */
  public getIndividualSketch = this.get(getIndividualSketch);

  /**
   * Get default metric metadata
   */
  public getDefaultMetricMetadata = this.get(getDefaultMetricMetadata);

  /**
   * Fetches data availability range for the given org and dataset/segment
   * @param req
   */
  public getTracesDateRange = async (req: GetBatchableTraceResourcesRequest): Promise<TraceDataRangeResponse> => {
    return this.batchTracesDateRange.load(req);
  };

  /**
   * Get columns active in the specified interval and optional segment
   */
  public getActiveColumns = this.get(getActiveColumns);
}

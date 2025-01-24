import { GetAlertsOverTimeResponse } from '@whylabs/data-service-node-client';

import {
  analysisMetricToGQL,
  metricToGQLCategory,
} from '../../../../graphql/contract-converters/data-service/analyzer-results-converter';
import {
  AlertCategory,
  AlertCategoryCount,
  AlertCategoryCounts,
  AnalysisMetric,
  GroupedAlertBatch,
} from '../../../../graphql/generated/graphql';
import { OperationContext } from '../../../../util/misc';
import { parsePossibleNaNWithDefault } from '../../../../util/numbers';
import { MutableAnalysisResultSchema } from '../../data-service/data-service-types';

// Use existing type to subset
type ResultFields = '__time' | 'anomalyCount' | 'datasetTimestamp' | 'metric' | 'column' | 'datasetId';
type PartialAnalysisResultSchema = Partial<Pick<MutableAnalysisResultSchema, ResultFields>>;

export type AnomalyCountSchema = {
  datasetId: string;
  timestamp: number;
  metric: AnalysisMetric;
  count: number;
  column: string;
  category: AlertCategory;
};

export type SegmentAnomalyCountSchema = {
  datasetId: string;
  timestamp: number;
  metric: AnalysisMetric;
  count: number;
  segment: string;
  category: AlertCategory;
};

export const dataServiceAnomalyCountsToGQL = (
  counts: GetAlertsOverTimeResponse[],
  context: OperationContext,
): AnomalyCountSchema[] =>
  counts.map((count) => {
    const enrichedContext = { ...context, datasetId: count.datasetId };
    return {
      datasetId: count.datasetId,
      timestamp: count.ts,
      metric: analysisMetricToGQL(enrichedContext, count.metric),
      count: count.anomalies,
      column: count.columnName,
      category: metricToGQLCategory(count.metric, enrichedContext),
    };
  });

export const dataServiceSegmentedAnomalyCountsToGQL = (
  bySegmentCounts: { [key: string]: GetAlertsOverTimeResponse[] },
  context: OperationContext,
): SegmentAnomalyCountSchema[] =>
  Object.entries(bySegmentCounts).flatMap(([segment, counts]) =>
    counts.map((count) => {
      const enrichedContext = { ...context, datasetId: count.datasetId };
      return {
        datasetId: count.datasetId,
        timestamp: count.ts,
        metric: analysisMetricToGQL(enrichedContext, count.metric),
        count: count.anomalies,
        column: count.columnName,
        category: metricToGQLCategory(count.metric, enrichedContext),
        segment,
      };
    }),
  );

export const anomalyCountToGQL = (
  anomalies: PartialAnalysisResultSchema[],
  context: OperationContext,
): AnomalyCountSchema[] =>
  anomalies.map((anomaly) => {
    const enrichedContext = { ...context, datasetId: anomaly.datasetId ?? undefined };
    return {
      datasetId: anomaly.datasetId ?? '',
      timestamp: parsePossibleNaNWithDefault(0, anomaly.__time),
      metric: analysisMetricToGQL(enrichedContext, anomaly.metric),
      count: parsePossibleNaNWithDefault(0, anomaly.anomalyCount),
      column: anomaly.column ?? '',
      category: metricToGQLCategory(anomaly.metric, enrichedContext),
    };
  });

type GroupByFieldNames = 'metric' | 'category';
type PartialCountSchema = Pick<AnomalyCountSchema, 'timestamp' | 'metric' | 'category' | 'count'>;
type AnomalyCountMap = Map<GroupByFieldNames, PartialCountSchema>;

const aggregateCountsByField = (
  anomalies: PartialCountSchema[],
  field: GroupByFieldNames,
): Map<number, AnomalyCountMap> => {
  // map of timestamp to metric to alertCount
  return anomalies.reduce((map, anomaly) => {
    const timestamp = anomaly.timestamp;
    // get existing alert category counts for this timestamp
    const countMap = map.get(timestamp) ?? new Map();

    // increment counter for the category
    if (anomaly[field]) {
      const oldCount = countMap.get(anomaly[field])?.count ?? 0;
      const newAnomaly = { ...anomaly, count: oldCount + anomaly.count };
      countMap.set(anomaly[field], newAnomaly);
    }
    map.set(timestamp, countMap);
    return map;
  }, new Map<number, AnomalyCountMap>());
};

const flattenCounts = (
  timeCountMap: Map<number, AnomalyCountMap>,
  transform: (a: PartialCountSchema) => AlertCategoryCount,
): GroupedAlertBatch[] =>
  Array.from(timeCountMap).map(([timestamp, metricCountMap]) => {
    const counts = Array.from(metricCountMap.values()).map((anomaly) => transform(anomaly));
    return {
      timestamp,
      counts,
    };
  });

export type AnomalyCountsBySegment = Map<string, AlertCategoryCounts>;

export const countsByCategoryBySegment = (
  segments: string[],
  results: SegmentAnomalyCountSchema[],
  field: GroupByFieldNames,
): AnomalyCountsBySegment => {
  const anomalyCountMapper = (a: PartialCountSchema) => ({
    ...(field == 'metric' && { metric: a.metric }),
    category: a.category,
    count: a.count,
  });
  const resultsBySegment = new Map<string, AlertCategoryCounts>();
  segments.forEach((segment) => {
    const segmentResults = results.filter((r) => r.segment === segment);
    resultsBySegment.set(segment, {
      totals: [], // should be computed on demand by a GraphQL resolver.
      timeseries: flattenCounts(aggregateCountsByField(segmentResults, field), anomalyCountMapper),
    });
  });
  return resultsBySegment;
};

export const countsByFieldByDatasetByFeature = (
  requestedDatasetIDs: Set<string>,
  requestedFeatures: Set<string | null>, // null is a special value indicating all features
  parsedResults: AnomalyCountSchema[],
  field: GroupByFieldNames,
): AlertCountsByFeatureAndDataset => {
  const resultsByDatasetId = new Map<string, Map<string | null, AlertCategoryCounts>>();

  // create a map of datasetId -> GraphQL alert count results
  for (const datasetId of requestedDatasetIDs) {
    const resultsByFeature = new Map<string | null, AlertCategoryCounts>();

    const resultsForDataset = parsedResults.filter((res) => res.datasetId === datasetId);
    const parsedResultsByFeature = resultsForDataset.reduce((featureAlertMap, anomaly) => {
      const featureName = anomaly.column;
      if (featureName) {
        const existingFeatureAnomalies = featureAlertMap.get(featureName) ?? [];
        featureAlertMap.set(featureName, existingFeatureAnomalies.concat(anomaly));
      }

      return featureAlertMap;
    }, new Map<string, AnomalyCountSchema[]>());

    // create a map of featureName -> GraphQL alert count results
    for (const featureName of requestedFeatures) {
      // if we're looking at a specific feature, grab results just for that feature
      // otherwise grab all results
      const anomalyCounts = featureName == null ? resultsForDataset : parsedResultsByFeature.get(featureName) ?? [];
      const anomalyCountMapper = (a: PartialCountSchema) => ({
        ...(field == 'metric' && { metric: a.metric }),
        category: a.category,
        count: a.count,
      });
      resultsByFeature.set(featureName, {
        totals: [], // should be computed on demand by a GraphQL resolver. CPU optimization lol!
        timeseries: flattenCounts(aggregateCountsByField(anomalyCounts, field), anomalyCountMapper),
      });
    }

    resultsByDatasetId.set(datasetId, resultsByFeature);
  }

  return resultsByDatasetId;
};

export const countsByMetricByFeature = (
  requestedDatasets: Set<string>,
  requestedFeatures: Set<string | null>,
  parsedResults: AnomalyCountSchema[],
): AlertCountsByFeatureAndDataset =>
  countsByFieldByDatasetByFeature(requestedDatasets, requestedFeatures, parsedResults, 'metric');

export const countsByCategoryByFeature = (
  requestedDatasets: Set<string>,
  requestedFeatures: Set<string | null>,
  parsedResults: AnomalyCountSchema[],
): AlertCountsByFeatureAndDataset =>
  countsByFieldByDatasetByFeature(requestedDatasets, requestedFeatures, parsedResults, 'category');

type FeatureName = string | null;
type DatasetId = string;
export type AlertCountsByFeatureAndDataset = Map<DatasetId, Map<FeatureName, AlertCategoryCounts>>;

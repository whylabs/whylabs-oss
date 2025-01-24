// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { transform } from 'node-json-transform';
import { generateLink } from '../monitor/common';

export const pagerdutyDigestMap = {
  item: {
    id: 'id',
    alerted_features: 'featureAnomalies',
    alerted_segments: 'segmentAnomalies',
    dataset_id: 'datasetId',
    dataset_name: 'dataset.name',
    mode: 'monitorMode',
    most_recent_anomalies: 'anomalySample',
    org_id: 'org.id',
    time_range: 'timeRange',
    total_alerts: 'totalAnomalies',
    severity: 'severity',
    start: 'start',
    end: 'end',
    schema_version: 'schemaVersion',
  },
  operate: [
    {
      // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
      run: (val: any, context: any) => transform(val, alertedSegmentMap, context),
      on: 'alerted_segments',
    },
    {
      // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
      run: (val: any, context: any) => transform(val, alertedFeatureMap, context),
      on: 'alerted_features',
    },
    {
      // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
      run: (val: any, context: any) => transform(val, anomalyMap, context),
      on: 'most_recent_anomalies',
    },
  ],
  remove: ['start', 'end'],
};

export const alertedSegmentMap = {
  item: {
    count: 'numAnomalies',
    features: 'columns',
    segment: 'segment',
    type: 'analyzerType',
    url: 'url',
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  each: function (item: any, index: any, collection: any, context: { org: any; datasetId: any; start: any; end: any }) {
    const { org, datasetId, start, end } = context;
    const url = generateLink(
      org,
      'column',
      datasetId,
      item.features,
      item.segment,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
    item.url = url ?? undefined;
  },
};

export const alertedFeatureMap = {
  item: {
    count: 'numAnomalies',
    feature: 'column',
    type: 'analyzerType',
    url: 'url',
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  each: function (item: any, index: any, collection: any, context: { org: any; datasetId: any; start: any; end: any }) {
    const { org, datasetId, start, end } = context;
    const url = generateLink(
      org,
      'column',
      datasetId,
      [item.feature],
      null,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
    item.url = url ?? undefined;
  },
};

export const anomalyMap = {
  item: {
    id: 'id',
    algorithm: 'algorithm',
    algorithm_mode: 'algorithmMode',
    analysis_id: 'analysisId',
    analyzer_id: 'analyzerId',
    creation_timestamp: 'creationTimestamp',
    dataset_id: 'datasetId',
    dataset_timestamp: 'datasetTimestamp',
    feature: 'column',
    granularity: 'granularity',
    img_expiry_datetime: 'img_expiry_datetime',
    img_url: 'img_url',
    metric: 'metric',
    mode: 'monitorMode',
    run_id: 'runId',
    segment: 'segment',
    target_level: 'targetLevel',
    type: 'analyzerType',
    url: 'url',
    weight: 'weight',
    start: 'earliestAnomalyDatasetTimestamp',
    end: 'oldestAnomalyDatasetTimestamp',
  },
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  each: function (item: any, index: any, collection: any, context: { org: any }) {
    const { org } = context;
    const url = generateLink(org, item.target_level, item.dataset_id, [item.feature], item.segment);
    item.url = url;
  },
};

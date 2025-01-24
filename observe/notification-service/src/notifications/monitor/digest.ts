import { MonitorModeType, MonitorSeverity } from './common';
import { DigestMetadata, MonitorDigestSQSMessage, MonitorSQSMessage } from './types';
import { getEntitySchema, getModel, getMonitor, getOrganization } from '../../services/data/songbird/songbird-wrapper';
import {
  getModelAlertsUrl,
  getModelConstraintsUrl,
  getModelOverviewUrl,
  getMonitorManagerUrl,
  getNotificationSettingUrl,
} from '../../util/url-generator';
import { isNotNull, isNotUndefined } from '../../util/type-guards';
import { mapStringToTimePeriod } from '../../util/batchProfileUtils';

// e.g. Digest: Your monitor "Frequent Items Drift Preset Monitor" on dataset "lending_club_credit_model" detected several medium severity issues
export const digestTitle = (monitor: string, dataset: string, severityDescription: string): string =>
  `Alert: Your monitor "${monitor}" on dataset "${dataset}" detected ${severityDescription}`;

export const processDigestNotificationMetadata = async (sqsMessage: MonitorSQSMessage): Promise<DigestMetadata> => {
  if (!isValidDigestSqsMessage(sqsMessage)) {
    throw Error(`Failed to process Digest notification - Invalid SQS message ${JSON.stringify(sqsMessage)}`);
  }

  const { orgId, monitorId, datasetId } = sqsMessage as MonitorDigestSQSMessage;

  const [org, dataset, monitor, entitySchema] = await Promise.all([
    getOrganization(orgId),
    getModel(orgId, datasetId),
    getMonitor(orgId, datasetId, monitorId),
    getEntitySchema(orgId, datasetId),
  ]);

  if (!org || !org.observatoryUrl || org.observatoryUrl.trim().length == 0) {
    throw Error(`Failed to lookup org metadata - Org doesn't exist OrgId=${orgId}`);
  }

  if (!monitor) {
    throw Error(
      `Failed to process Digest notification - orgI=${orgId} datasetId=${datasetId} monitorId=${monitorId} doesn't exist`,
    );
  }

  const {
    id,
    runId,
    severity,
    columnStatistics,
    segmentStatistics,
    numAnomalies,
    earliestAnomalyDatasetTimestamp: start,
    oldestAnomalyDatasetTimestamp: end,
  } = sqsMessage as MonitorDigestSQSMessage;

  const startDate = new Date(start);
  const endDate = new Date(end);
  const timePeriod = mapStringToTimePeriod.get(dataset?.timePeriod ?? '');

  return {
    id: id,
    runId: runId,
    monitorMode: MonitorModeType.Digest,
    org: org,
    datasetId: datasetId,
    dataset: dataset,
    entitySchema: entitySchema,
    monitor: monitor,
    severity: severity ?? MonitorSeverity.Low,
    notificationSettingsUrl: getNotificationSettingUrl(org.observatoryUrl, orgId),
    monitorManagerUrl: getMonitorManagerUrl(org.observatoryUrl, datasetId, orgId),
    modelAlertsUrl: getModelAlertsUrl(org.observatoryUrl, datasetId, [], orgId, startDate, endDate, timePeriod),
    modelDashboardUrl: getModelOverviewUrl(org.observatoryUrl, datasetId, [], orgId, startDate, endDate, timePeriod),
    modelConstraintsUrl: getModelConstraintsUrl(org.observatoryUrl, datasetId, orgId, startDate, endDate, timePeriod),
    schemaVersion: '3.0',
    featureAnomalies: columnStatistics,
    segmentAnomalies: segmentStatistics,
    anomalySample: [],
    totalAnomalies: numAnomalies,
    timeRange: `${new Date(start).toISOString()}/${new Date(end).toISOString()}`,
    end: end,
    start: start,
  };
};

const isValidDigestSqsMessage = (sqsMessage: unknown): sqsMessage is MonitorDigestSQSMessage => {
  const propsToCheck: (keyof MonitorDigestSQSMessage)[] = [
    'runId',
    'orgId',
    'monitorId',
    'datasetId',
    'numAnomalies',
    'oldestAnomalyDatasetTimestamp',
    'earliestAnomalyDatasetTimestamp',
    'columnStatistics',
    'segmentStatistics',
  ];

  const maybeMessage = sqsMessage as MonitorDigestSQSMessage;
  return propsToCheck.every((prop) => isNotUndefined(maybeMessage[prop]) && isNotNull(maybeMessage[prop]));
};

import { generateLink, MonitorModeType, MonitorSeverity } from './common';
import { AnalyzerResult, EveryAnomalyMetadata, MonitorEveryAnomalySQSMessage, MonitorSQSMessage } from './types';
import { getModel, getMonitor, getOrganization } from '../../services/data/songbird/songbird-wrapper';
import {
  getModelAlertsUrl,
  getModelConstraintsUrl,
  getModelOverviewUrl,
  getMonitorManagerUrl,
  getNotificationSettingUrl,
} from '../../util/url-generator';
import { isNotNull, isNotUndefined } from '../../util/type-guards';
import { getEndOfProfile, mapStringToTimePeriod } from '../../util/batchProfileUtils';

export const everyAnomalyTitle = (
  monitor: string,
  dataset: string,
  feature: string,
  severityDescription: string,
): string =>
  `Anomaly: Your monitor "${monitor}" on feature "${feature}" from dataset "${dataset}" detected ${severityDescription}`;

export const processEveryAnomalyNotificationMetadata = async (
  sqsMessage: MonitorSQSMessage,
): Promise<EveryAnomalyMetadata> => {
  if (!isValidEveryAnomalySqsMessage(sqsMessage)) {
    throw Error(`Failed to process EveryAnomaly notification - Invalid SQS message ${JSON.stringify(sqsMessage)}`);
  }
  const { id, runId, severity, analyzerResult, monitorId } = sqsMessage;

  if (!isValidAnalyzerResult(analyzerResult)) {
    throw Error(
      `Failed to process EveryAnomaly notification - Invalid Analyzer result ${JSON.stringify(analyzerResult)}`,
    );
  }

  const { orgId, datasetId, column, analysisId, targetLevel, segment } = analyzerResult;
  const [org, dataset, monitor] = await Promise.all([
    getOrganization(orgId),
    getModel(orgId, datasetId),
    getMonitor(orgId, datasetId, monitorId),
  ]);

  if (!org || !org.observatoryUrl) {
    throw Error(`Failed to lookup org metadata org=${orgId} doesn't exist`);
  }

  if (!monitor) {
    throw Error(
      `Failed to process EveryAnomaly notification - orgI=${orgId} datasetId=${datasetId} monitorId=${monitorId} doesn't exist`,
    );
  }
  const { datasetTimestamp } = analyzerResult;
  const timePeriod = mapStringToTimePeriod.get(dataset?.timePeriod ?? '');
  const startDate = datasetTimestamp;
  const endDate = startDate ? getEndOfProfile(timePeriod, startDate) : undefined;

  return {
    id: id,
    runId: runId,
    monitorMode: MonitorModeType.EveryAnomaly,
    org: org,
    datasetId: datasetId,
    dataset: dataset ?? null,
    monitor: monitor,
    severity: severity ?? MonitorSeverity.Low,
    notificationSettingsUrl: getNotificationSettingUrl(org.observatoryUrl, orgId),
    monitorManagerUrl: getMonitorManagerUrl(org.observatoryUrl, datasetId, orgId),
    modelAlertsUrl: getModelAlertsUrl(org.observatoryUrl, datasetId, [], orgId, startDate, endDate, timePeriod),
    modelDashboardUrl: getModelOverviewUrl(org.observatoryUrl, datasetId, [], orgId, startDate, endDate, timePeriod),
    modelConstraintsUrl: getModelConstraintsUrl(org.observatoryUrl, datasetId, orgId, startDate, endDate, timePeriod),
    schemaVersion: '3.0',
    analysisId: analysisId,
    feature: column,
    analyzerResult: {
      ...analyzerResult,
      url: generateLink(org, targetLevel, datasetId, [column], segment, startDate, endDate, timePeriod),
    },
  };
};

const isValidEveryAnomalySqsMessage = (sqsMessage: unknown): sqsMessage is MonitorEveryAnomalySQSMessage => {
  const propsToCheck: (keyof MonitorEveryAnomalySQSMessage)[] = ['runId', 'orgId', 'monitorId', 'analyzerResult'];

  const maybeMessage = sqsMessage as MonitorEveryAnomalySQSMessage;
  return propsToCheck.every((prop) => isNotUndefined(maybeMessage[prop]) && isNotNull(maybeMessage[prop]));
};

const isValidAnalyzerResult = (analyzerResult: unknown): analyzerResult is AnalyzerResult => {
  const propsToCheck: (keyof AnalyzerResult)[] = ['datasetId', 'column', 'analysisId'];
  const maybeAnalyzerResult = analyzerResult as AnalyzerResult;
  return propsToCheck.every(
    (prop) => isNotUndefined(maybeAnalyzerResult[prop]) && isNotNull(maybeAnalyzerResult[prop]),
  );
};

import { getLogger } from '../../providers/logger';
import { MonitorModeType, MonitorSeverity } from './common';
import { processDigestNotificationMetadata } from './digest';
import { processEveryAnomalyNotificationMetadata } from './every-anomaly';
import {
  AnalyzerResult,
  DigestMetadata,
  EveryAnomalyMetadata,
  FeatureStats,
  GlobalAction,
  isValidGlobalAction,
  MonitorDigestSQSMessage,
  MonitorEveryAnomalySQSMessage,
  MonitorSQSMessage,
  NotificationHandler,
  SegmentStats,
  TestNotificationSQSMessage,
} from './types';
import { groupByResult } from '../../util/promises';
import { sendSlackDigestNotification } from './digest-slack';
import { sendEmailDigestNotificationV2 } from './digest-email';
import { sendDigestPagerDutyNotification } from './digest-pagerduty';
import { sendSlackEveryAnomalyNotification } from './every-anomaly-slack';
import { sendEmailEveryAnomalyNotificationV2 } from './every-anomaly-email';
import { sendPagerDutyEveryAnomalyNotification } from './every-anomaly-pagerduty';
import {
  ActionType,
  EmailNotificationAction,
  OrganizationMetadata,
  PagerDutyNotificationAction,
  SlackNotificationAction,
  TeamsNotificationAction,
  WebhookNotificationAction,
} from '@whylabs/songbird-node-client';
import {
  ackMessage,
  getNotificationAction,
  getOrganization,
  Monitor,
} from '../../services/data/songbird/songbird-wrapper';
import { getOverrideConfig } from '../../services/data/config/overrides';
import { sendTeamsDigestNotification } from './digest-teams';
import { sendTeamsEveryAnomalyNotification } from './every-anomaly-teams';
import { sendWebhookDigestNotification } from './digest-webhook';
import { sendWebhookEveryAnomalyNotification } from './every-anomaly-webhook';

const logger = getLogger('MonitorNotificationsManager');

const isAnomalyMessage = (message: MonitorSQSMessage): message is MonitorEveryAnomalySQSMessage =>
  message.mode === MonitorModeType.EveryAnomaly;

const isDigestMessage = (message: MonitorSQSMessage): message is MonitorDigestSQSMessage =>
  message.mode === MonitorModeType.Digest;

/**
 * Sends test notifications for real time alerts.
 */
export const processTestNotification = async (msgId: string, message: TestNotificationSQSMessage): Promise<void> => {
  await handleTestNotification(
    msgId,
    message.org_id,
    message.action_id,
    sendSlackDigestNotification,
    sendEmailDigestNotificationV2,
    sendDigestPagerDutyNotification,
    sendTeamsDigestNotification,
    sendWebhookDigestNotification,
  );
  logger.info(
    'Successfully processed test notification message. Message %s, org %s, action %s',
    msgId,
    message.org_id,
    message.action_id,
  );
};

/**
 * Sends notifications for real time alerts.
 */
export const processMonitorNotification = async (msgId: string, sqsMessage: MonitorSQSMessage): Promise<void> => {
  try {
    if (isDigestMessage(sqsMessage)) {
      logger.info('Processing Monitor V3 digest notification. Message %s, org %s', msgId, sqsMessage.orgId);
      // note - awaiting here is super important so that any errors are caught!
      const metadata = await processDigestNotificationMetadata(sqsMessage);
      if (metadata.org.deleted || metadata.dataset?.active === false) {
        logger.info('Dropping notification message for deleted dataset. Message %s, org %s', msgId, sqsMessage.orgId);
        return;
      }
      await handleNotification(
        msgId,
        sqsMessage.mode,
        metadata,
        sendSlackDigestNotification,
        sendEmailDigestNotificationV2,
        sendDigestPagerDutyNotification,
        sendTeamsDigestNotification,
        sendWebhookDigestNotification,
      );
      logger.info(
        'Successfully processed Monitor V3 digest notification. NumAnomalies %s Message %s, org %s',
        metadata.totalAnomalies,
        msgId,
        sqsMessage.orgId,
      );
      await ackMessage(sqsMessage.orgId, metadata.datasetId, metadata.runId, metadata.monitor.id);
      return;
    } else if (isAnomalyMessage(sqsMessage)) {
      logger.info(
        'Processing Monitor V3 anomaly notification. Message %s, org %s',
        msgId,
        sqsMessage.analyzerResult?.orgId,
      );
      // note - awaiting here is super important so that any errors are caught!
      const metadata = await processEveryAnomalyNotificationMetadata(sqsMessage);
      if (metadata.org.deleted || metadata.dataset?.active === false) {
        logger.info('Dropping notification message for deleted dataset. Message %s, org %s', msgId, sqsMessage.orgId);
        return;
      }
      await handleNotification(
        msgId,
        sqsMessage.mode,
        metadata,
        sendSlackEveryAnomalyNotification,
        sendEmailEveryAnomalyNotificationV2,
        sendPagerDutyEveryAnomalyNotification,
        sendTeamsEveryAnomalyNotification,
        sendWebhookEveryAnomalyNotification,
      );
      logger.info(
        'Successfully processed Monitor V3 anomaly notification. Message %s, org %s',
        msgId,
        sqsMessage.analyzerResult?.orgId,
      );
      return;
    } else {
      logger.error(`Unknown or invalid notification mode. Msg: ${JSON.stringify(sqsMessage)}. Dropping message.`);
    }
  } catch (err) {
    logger.error(
      err,
      'Failed to process monitor notification message %s. Removing message from queue. Org %s, mode %s',
      msgId,
      sqsMessage.orgId,
      sqsMessage.mode,
    );
    // no-op, message will be removed from SQS
    // retries (if any) should be handled within this function
  }
};

const handleTestNotification = async (
  messageId: string,
  orgId: string,
  actionId: string,
  slackNotificationHandler: NotificationHandler<DigestMetadata, SlackNotificationAction>,
  emailNotificationHandler: NotificationHandler<DigestMetadata, EmailNotificationAction>,
  pagerdutyNotificationHandler: NotificationHandler<DigestMetadata, PagerDutyNotificationAction>,
  teamsNotificationHandler: NotificationHandler<DigestMetadata, TeamsNotificationAction>,
  webhookNotificationHandler: NotificationHandler<DigestMetadata, WebhookNotificationAction>,
): Promise<void> => {
  logger.info(`Processing test notification action id=${actionId} org=${orgId} message=${messageId}`);
  const org = await getOrganization(orgId);
  if (!org) {
    throw Error(`Failed organization lookup org=${orgId} does not exist`);
  }
  const globalAction = await getGlobalAction(actionId, org);
  if (!globalAction) {
    throw Error(`Failed action lookup actionId=${actionId} org=${orgId} does not exist`);
  }

  // TODO: We need a better way to generate mock result data for the notification template
  const mockMonitorId = 'test-monitor-id';
  const mockMonitorName = 'Test Monitor';
  const mockMonitor = {
    id: mockMonitorId,
    displayName: mockMonitorName,
  } as Monitor;
  const mockStart = 946713600000; // 2000-01-01
  const mockEnd = 1893484800000; // 2030-01-01
  const mockFeatureStats = {
    numAnomalies: 1,
    column: 'feature_name',
    analyzerType: 'seasonal',
    oldestAnomalyDatasetTimestamp: 1704096000000,
    earliestAnomalyDatasetTimestamp: 1672560000000,
    url: 'https://hub.whylabsapp.com/resources',
  } as FeatureStats;
  const mockSegmentStats = {
    numAnomalies: 1,
    segment: 'source_type=segment_name',
    columns: ['feature_name'],
    oldestAnomalyDatasetTimestamp: 1704096000000,
    earliestAnomalyDatasetTimestamp: 1672560000000,
    url: 'https://hub.whylabsapp.com/resources',
  } as SegmentStats;
  const mockAnalyzerResult = {
    id: 'test-notification',
    analysisId: 'test-notification-analysis-id',
    orgId: orgId,
    datasetId: 'test-notification',
    column: 'feature_name',
    granularity: 'DAYS',
    creationTimestamp: 1673045186948,
    targetLevel: 'column',
    anomalyCount: 1,
    targetCount: 1,
    targetBatchesWithProfileCount: 1,
    baselineCount: 1,
    baselineBatchesWithProfileCount: 89,
    expectedBaselineCount: 90,
    expectedBaselineSuppressionThreshold: 3,
    isRollup: false,
    runId: 'test-notification-run-id',
    analyzerId: 'seasonal-analyzer',
    metric: 'median',
    analyzerType: 'seasonal',
    algorithm: 'hellinger',
    monitorIds: [mockMonitorId],
    traceIds: [],
    analyzerConfigVersion: 0,
    analyzerResultType: 'SeasonalResult',
  } as AnalyzerResult;
  const mockMetadata = {
    id: messageId,
    runId: messageId,
    monitorMode: MonitorModeType.Digest,
    org: org,
    datasetId: 'test-model',
    dataset: {
      name: 'Test Model',
    },
    monitor: mockMonitor,
    severity: MonitorSeverity.Low,
    notificationSettingsUrl: 'https://hub.whylabsapp.com/settings/notifications',
    monitorManagerUrl: 'https://hub.whylabsapp.com/resources/demo-llm-chatbot/monitor-manager?targetOrgId=demo',
    modelAlertsUrl:
      'https://hub.whylabsapp.com/resources/demo-llm-chatbot/monitor-manager/anomalies-feed?targetOrgId=demo',
    modelDashboardUrl: 'https://hub.whylabsapp.com/resources/demo-llm-chatbot/summary?targetOrgId=demo',
    modelConstraintsUrl:
      'https://hub.whylabsapp.com/resources/model-2/constraints?sortModelBy=LatestAlert&sortModelDirection=DESC&targetOrgId=demo',
    schemaVersion: '3.0',
    featureAnomalies: [mockFeatureStats],
    segmentAnomalies: [mockSegmentStats],
    anomalySample: [mockAnalyzerResult],
    totalAnomalies: 1,
    timeRange: `${new Date(mockStart).toISOString()}/${new Date(mockEnd).toISOString()}`,
    start: mockStart,
    end: mockEnd,
  } as DigestMetadata;

  switch (globalAction.type) {
    case ActionType.Email:
      await emailNotificationHandler(messageId, mockMonitorId, mockMonitorName, mockMetadata, globalAction.payload);
      break;
    case ActionType.PagerDuty:
      await pagerdutyNotificationHandler(messageId, mockMonitorId, mockMonitorName, mockMetadata, globalAction.payload);
      break;
    case ActionType.Slack:
      await slackNotificationHandler(messageId, mockMonitorId, mockMonitorName, mockMetadata, globalAction.payload);
      break;
    case ActionType.Teams:
      await teamsNotificationHandler(messageId, mockMonitorId, mockMonitorName, mockMetadata, globalAction.payload);
      break;
    case ActionType.Webhook:
      await webhookNotificationHandler(messageId, mockMonitorId, mockMonitorName, mockMetadata, globalAction.payload);
      break;
  }
};

const handleNotification = async <TMetadata extends DigestMetadata | EveryAnomalyMetadata>(
  messageId: string,
  mode: string,
  metadata: TMetadata,
  slackNotificationHandler: NotificationHandler<TMetadata, SlackNotificationAction>,
  emailNotificationHandler: NotificationHandler<TMetadata, EmailNotificationAction>,
  pagerdutyNotificationHandler: NotificationHandler<TMetadata, PagerDutyNotificationAction>,
  teamsNotificationHandler: NotificationHandler<TMetadata, TeamsNotificationAction>,
  webhookNotificationHandler: NotificationHandler<TMetadata, WebhookNotificationAction>,
): Promise<void> => {
  const { org, monitor, datasetId } = metadata;
  const { id: monitorId, actions, displayName: monitorName } = monitor ?? {};

  const overrides = await getOverrideConfig();
  const matches = overrides?.exclude?.filter((entry) => {
    const matchOrg = entry.orgId === org.id || entry.orgId === '*';
    const matchDataset = entry.datasetId === datasetId || entry.datasetId === '*';
    const matchMode = !entry.mode || entry.mode === mode || entry.mode === '*';
    matchOrg && matchDataset && matchMode;
  });
  if (matches?.length) {
    logger.info(
      'Skipping notification for org %s, datasetId %s, monitorId %s, messageId %s, msgMode %s due to override config',
      org.id,
      datasetId,
      monitorId,
      messageId,
      mode,
    );
    return;
  }

  if (!actions?.length || !monitorId) {
    logger.warn(
      'Attempted to send notifications for org=%s dataset=%s monitor=%s (%s) but no actions (%s) were defined',
      org.id,
      datasetId,
      monitorId,
      monitorName,
      actions?.length,
    );
    return;
  }

  const actionResults = await Promise.allSettled(
    actions.map(async (action) => {
      logger.info(`Trying to process global action type=${action.type} action=${action.target} for org=${org.id}`);

      try {
        if (action.type !== 'global') {
          // TODO #296td0h only global actions supported atm
          throw Error(`Unsupported action type ${action.type}`);
        }

        if (!action.target) {
          throw Error(`Not defined ${action.target}`);
        }

        const globalAction = await getGlobalAction(action.target, org);
        if (!globalAction) {
          logger.warn(`Could not find global action: ${JSON.stringify(action)}`);
          return;
        }
        if (globalAction.enabled === false) {
          logger.info(
            `Dropping notification. Action ${action.target} is disabled. Source: ${org.id}, ${datasetId}, ${monitorId}, ${messageId}`,
          );
          return;
        }
        switch (globalAction.type) {
          case ActionType.Email: {
            const updatedMetadata = updateMetadataUrls(metadata, ActionType.Email);
            await emailNotificationHandler(messageId, monitorId, monitorName, updatedMetadata, globalAction.payload);
            break;
          }
          case ActionType.PagerDuty: {
            const updatedMetadata = updateMetadataUrls(metadata, ActionType.PagerDuty);
            await pagerdutyNotificationHandler(
              messageId,
              monitorId,
              monitorName,
              updatedMetadata,
              globalAction.payload,
            );
            break;
          }
          case ActionType.Slack: {
            const updatedMetadata = updateMetadataUrls(metadata, ActionType.Slack);
            await slackNotificationHandler(messageId, monitorId, monitorName, updatedMetadata, globalAction.payload);
            break;
          }
          case ActionType.Teams: {
            const updatedMetadata = updateMetadataUrls(metadata, ActionType.Teams);
            await teamsNotificationHandler(messageId, monitorId, monitorName, updatedMetadata, globalAction.payload);
            break;
          }
          case ActionType.Webhook: {
            const updatedMetadata = updateMetadataUrls(metadata, ActionType.Webhook);
            await webhookNotificationHandler(messageId, monitorId, monitorName, updatedMetadata, globalAction.payload);
            break;
          }
        }

        logger.info(
          'Successfully sent notification for org %s, message %s, msgMode %s, datasetId %s, monitorId %s, action %s',
          org.id,
          messageId,
          mode,
          datasetId,
          monitorId,
          action.target,
        );
      } catch (err) {
        logger.error(
          err,
          'Failed to send notification for org %s, message %s, msgMode %s, datasetId %s, monitorId %s, action %s',
          org.id,
          messageId,
          mode,
          datasetId,
          monitorId,
          action.target,
        );
        throw err;
      }
    }),
  );

  const { fulfilled: fulfilledActions } = groupByResult(actionResults);
  logger.info(
    'Successfully sent notifications for %s of %s actions for org %s, datasetId %s, monitorId %s, messageId %s, msgMode %s',
    fulfilledActions.length,
    actions.length,
    org.id,
    datasetId,
    monitorId,
    messageId,
    mode,
  );
};

const getGlobalAction = async (actionTarget: string, org: OrganizationMetadata): Promise<GlobalAction | null> => {
  const globalAction = await getNotificationAction(org.id, actionTarget);
  if (!globalAction) {
    throw Error(`Missing global action for org ${org.id} actionId ${actionTarget}`);
  }
  if (isValidGlobalAction(globalAction)) {
    return globalAction;
  }
  throw Error(`Invalid or unsupported global action: ${JSON.stringify(globalAction)}`);
};

const updateMetadataUrls = <T extends DigestMetadata | EveryAnomalyMetadata>(metadata: T, utmMedium: ActionType): T => {
  const { monitorManagerUrl, modelAlertsUrl, modelDashboardUrl, modelConstraintsUrl, notificationSettingsUrl } =
    metadata;

  const utmSource = metadata.monitorMode === MonitorModeType.EveryAnomaly ? 'every_anomaly' : 'digest';
  const medium = utmMedium.toLowerCase();

  let updatedAnalyzerResult: AnalyzerResult | undefined;

  if ('analyzerResult' in metadata) {
    const { analyzerResult } = metadata as EveryAnomalyMetadata;
    if (analyzerResult?.url) {
      updatedAnalyzerResult = {
        ...analyzerResult,
        url: `${analyzerResult.url}&utm_medium=${medium}&utm_source=${utmSource}`,
      };
    }
  }

  return {
    ...metadata,
    modelAlertsUrl: `${modelAlertsUrl}&utm_medium=${medium}&utm_source=${utmSource}`,
    modelDashboardUrl: `${modelDashboardUrl}&utm_medium=${medium}&utm_source=${utmSource}`,
    modelConstraintsUrl: `${modelConstraintsUrl}&utm_medium=${medium}&utm_source=${utmSource}`,
    notificationSettingsUrl: `${notificationSettingsUrl}&utm_medium=${medium}&utm_source=${utmSource}`,
    monitorManagerUrl: `${monitorManagerUrl}&utm_medium=${medium}&utm_source=${utmSource}`,
    ...(updatedAnalyzerResult ? { analyzerResult: updatedAnalyzerResult } : {}),
  };
};

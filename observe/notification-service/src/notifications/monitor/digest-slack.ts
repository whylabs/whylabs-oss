import { sendSlackMessage } from '../../services/slack-wrapper';
import { SlackContent } from '../content-common';
import { KnownBlock, MessageAttachment } from '@slack/types';
import { generateLink, severityToFriendlyDescriptor } from './common';
import { SlackBlocksUI } from '../digest-v2/slack-blocks';
import { digestTitle } from './digest';
import { getLogger } from '../../providers/logger';
import { DigestMetadata, DigestSlackHandler } from './types';
import { SlackNotificationAction } from '@whylabs/songbird-node-client';
import { mapStringToTimePeriod } from '../../util/batchProfileUtils';

const logger = getLogger('DigestSlackNotificationsHandler');

export const sendSlackDigestNotification: DigestSlackHandler = async (
  messageId,
  monitorId,
  monitorName,
  metadata,
  slackAction: SlackNotificationAction,
) => {
  const { org } = metadata;
  const [content, attachment] = getDigestSlackContent(monitorId, monitorName, metadata);
  const slackWebhook = slackAction.slackWebhook.trim() ?? null;

  if (!slackWebhook) {
    throw Error(`No Slack integration key configured for org ${org.id} action ${JSON.stringify(slackAction)}`);
  }

  await sendSlackMessage(messageId, content, org, slackWebhook, attachment);
  logger.info('Sent Slack digest notification. Message %s, org %s', messageId, org.id);
};

const getDigestSlackContent = (
  monitorId: string,
  monitorName: string | undefined,
  {
    dataset,
    datasetId,
    org,
    start,
    end,
    featureAnomalies,
    segmentAnomalies,
    severity,
    totalAnomalies,
    monitorManagerUrl,
    notificationSettingsUrl,
    modelDashboardUrl,
    entitySchema,
  }: DigestMetadata,
): [SlackContent, MessageAttachment[]] => {
  const slackTitle = digestTitle(
    monitorName ?? monitorId,
    dataset?.name ?? datasetId,
    severityToFriendlyDescriptor(severity, totalAnomalies),
  ).replace(/"/g, '*');
  const blockUI: KnownBlock[] = [];
  blockUI.push(SlackBlocksUI.generateHeader(slackTitle));
  blockUI.push(SlackBlocksUI.generateDivider());
  blockUI.push(
    SlackBlocksUI.generateSection(`<${modelDashboardUrl}|${dataset?.name}> - ${totalAnomalies} alerts`, 'mrkdwn'),
  );
  const timePeriod = mapStringToTimePeriod.get(dataset?.timePeriod ?? '');
  // const segmentAlerts: string[] = [];
  if (featureAnomalies?.length > 0) {
    blockUI.push(SlackBlocksUI.generateHeader(`*Top Alerted Features*`, 'mrkdwn'));
    featureAnomalies
      .sort((a, b) => (a.numAnomalies <= b.numAnomalies ? 1 : -1))
      .slice(0, 19)
      .forEach((anomaly) => {
        const { column, numAnomalies } = anomaly;
        const columnSchema = entitySchema?.columns[column];
        const url = generateLink(
          org,
          'column',
          datasetId,
          [column],
          null,
          start ? new Date(start) : undefined,
          end ? new Date(end) : undefined,
          timePeriod,
          columnSchema,
        );
        blockUI.push(SlackBlocksUI.generateSection(`<${url}|${column}> - ${numAnomalies} alerts`, 'mrkdwn'));
      });
  }

  if (segmentAnomalies?.length > 0) {
    blockUI.push(SlackBlocksUI.generateHeader(`*Top Alerted Segments*`, 'mrkdwn'));
    segmentAnomalies
      .sort((a, b) => (a.numAnomalies <= b.numAnomalies ? 1 : -1))
      .slice(0, 19)
      .forEach((anomaly) => {
        const { columns, segment, numAnomalies } = anomaly;
        const url = generateLink(
          org,
          'column',
          datasetId,
          columns,
          segment,
          start ? new Date(start) : undefined,
          end ? new Date(end) : undefined,
          timePeriod,
        );
        blockUI.push(
          SlackBlocksUI.generateSection(
            `<${url}|${segment === '' ? 'Overall segment' : segment}> - ${numAnomalies} alerts`,
            'mrkdwn',
          ),
        );
      });
  }

  blockUI.push(SlackBlocksUI.generateDivider());
  blockUI.push(
    SlackBlocksUI.generateFooter(dataset?.name ?? '', modelDashboardUrl, monitorManagerUrl, notificationSettingsUrl),
  );

  return [blockUI, []];
};

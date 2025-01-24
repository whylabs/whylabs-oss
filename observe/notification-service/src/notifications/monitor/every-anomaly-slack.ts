import { sendSlackMessage } from '../../services/slack-wrapper';
import { SlackContent } from '../content-common';
import { KnownBlock, MessageAttachment } from '@slack/types';
import { severityToFriendlyDescriptor } from './common';
import { SlackBlocksUI } from '../digest-v2/slack-blocks';
import { getLogger } from '../../providers/logger';
import { everyAnomalyTitle } from './every-anomaly';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { transform } from 'node-json-transform';
import { anomalyMap } from '../templates/pagerduty-template';
import { EveryAnomalyMetadata, EveryAnomalySlackHandler } from './types';
import { SlackNotificationAction } from '@whylabs/songbird-node-client';

const logger = getLogger('EveryAnomalySlackNotificationsHandler');

export const sendSlackEveryAnomalyNotification: EveryAnomalySlackHandler = async (
  messageId: string,
  monitorId: string,
  monitorName: string | undefined,
  metadata: EveryAnomalyMetadata,
  slackAction: SlackNotificationAction,
) => {
  const { org } = metadata;
  const [content, attachment] = await getEveryAnomalySlackContent(monitorId, monitorName, metadata);

  const slackWebhook = slackAction.slackWebhook.trim() ?? null;
  if (!slackWebhook) {
    throw Error(`No Slack integration key configured for org ${org.id} action ${JSON.stringify(slackAction)}`);
  }

  await sendSlackMessage(messageId, content, org, slackWebhook, attachment);
  logger.info('Sent Slack digest notification. Message %s, org %s', org.id, messageId);
};

const getEveryAnomalySlackContent = async (
  monitorId: string,
  monitorName: string | undefined,
  metadata: EveryAnomalyMetadata,
): Promise<[SlackContent, MessageAttachment[]]> => {
  const { org, analyzerResult } = metadata;
  const { column, img_url, img_expiry_datetime } = analyzerResult;
  const slackTitle = everyAnomalyTitle(
    monitorName ?? monitorId,
    metadata.dataset?.name ?? metadata.datasetId,
    column,
    severityToFriendlyDescriptor(metadata.severity),
  );

  const context = {
    org: org,
  };

  // to keep it simple, using PagerDuty content for now
  const formattedCustomDetails = transform(analyzerResult, anomalyMap, context);

  const contentBlocks: KnownBlock[] = [];
  contentBlocks.push(SlackBlocksUI.generateSection(slackTitle));
  contentBlocks.push(SlackBlocksUI.generateSection('`' + JSON.stringify(formattedCustomDetails) + '`', 'mrkdwn'));

  if (img_url != null && img_expiry_datetime != null) {
    contentBlocks.push(SlackBlocksUI.generateImageBlock(img_url));
  }

  if (formattedCustomDetails.url) {
    contentBlocks.push(SlackBlocksUI.generateSection(`\n<${formattedCustomDetails.url}>`, 'mrkdwn'));
  }

  return [contentBlocks, []];
};

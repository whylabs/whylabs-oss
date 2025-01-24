import { OrganizationMetadata } from '@whylabs/songbird-node-client';
import { getLogger } from '../providers/logger';
import { getSlackWebhookClient } from '../providers/slack';
import { SlackContent } from '../notifications/content-common';
import { MessageAttachment } from '@slack/types';

import { NotificationType } from '../notifications/digest-v2/digest-notifier';
import { logNotification } from './notification-logger';

const logger = getLogger('SlackNotificationsWrapper');

export const sendSlackMessage = async (
  messageId: string,
  content: SlackContent,
  organizationMetadata: OrganizationMetadata,
  slackWebhook: string,
  attachments?: MessageAttachment[],
): Promise<void> => {
  const { id: orgId } = organizationMetadata;

  logger.info('Sending Slack chat message to org %s', orgId);

  if (!slackWebhook)
    throw new Error(
      `No Slack Webhook found for org ${orgId}, cannot send Slack notification. Was the Webhook specified in Songbird/Dynamo?`,
    );
  const partialWebhookForLogging = slackWebhook.substring(slackWebhook.length - 6, slackWebhook.length);

  try {
    const webhookClient = await getSlackWebhookClient(slackWebhook.trim());
    const msgBody =
      typeof content === 'string'
        ? content
        : {
            blocks: content,
            attachments: attachments ?? [],
          };
    await webhookClient.send(msgBody);

    logger.info(
      'Successfully sent Slack chat message to org %s webhook ending with %s',
      orgId,
      partialWebhookForLogging,
    );
    await logNotification(messageId, NotificationType.SLACK, orgId, JSON.stringify(msgBody, null, 2));
  } catch (err) {
    logger.error(
      err,
      'Failed to send Slack message to orgId=%s webhook=%s content=%s attachments=%s',
      orgId,
      partialWebhookForLogging,
      JSON.stringify(content),
      JSON.stringify(attachments),
    );
    throw err;
  }
};

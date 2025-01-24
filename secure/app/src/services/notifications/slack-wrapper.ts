import { Block, KnownBlock } from '@slack/types';

import { getLogger } from '../../providers/logger';
import { getSlackWebhookClient } from '../../providers/slack';

export type SlackContent = string | (KnownBlock | Block)[];

const logger = getLogger('SlackNotificationsWrapper');

export const sendSlackMessage = async (webhook: string, content: SlackContent): Promise<void> => {
  logger.info('Sending Slack chat message');

  try {
    const webhookClient = await getSlackWebhookClient(webhook);
    await webhookClient.send(typeof content === 'string' ? content : { blocks: content });
    logger.info('Successfully sent Slack chat message');
  } catch (err) {
    logger.error(err, 'Failed to send Slack message');
    throw err;
  }
};

import { IncomingWebhook } from '@slack/webhook';
import { getLogger } from './logger';

const logger = getLogger('SlackProvider');

const webhookCache = new Map<string, IncomingWebhook>();

export const getSlackWebhookClient = async (url: string): Promise<IncomingWebhook> => {
  if (!webhookCache.has(url)) {
    logger.info('Creating new Slack WebHook client');
    webhookCache.set(url, new IncomingWebhook(url));
  }

  return webhookCache.get(url) as IncomingWebhook;
};

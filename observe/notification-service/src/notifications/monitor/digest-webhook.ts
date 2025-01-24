import { getLogger } from '../../providers/logger';
import { DigestMetadata, DigestWebhookHandler } from './types';
import { WebhookNotificationAction } from '@whylabs/songbird-node-client';
import * as https from 'https';

const logger = getLogger('DigestWebhookNotificationsHandler');

export const sendWebhookDigestNotification: DigestWebhookHandler = async (
  messageId,
  monitorId,
  monitorName,
  metadata,
  webhook: WebhookNotificationAction,
) => {
  const { org } = metadata;
  const webhookUrl = webhook.url.trim() ?? null;
  if (!webhookUrl) {
    throw Error(`No webhook url configured for org ${org.id} action ${JSON.stringify(webhook)}`);
  }
  const defaultMessage = JSON.stringify({
    monitorId,
    monitorName,
  });
  const message = webhook.body ?? defaultMessage;
  const postData = replaceMessageMacros(message, metadata);
  const headers = {
    'Content-Length': Buffer.byteLength(postData),
    ...webhook.headers,
  };
  const url = new URL(webhookUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: webhook.method,
    headers: headers,
  };

  const req = https.request(options, (res) => {
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });
  req.write(postData);
  req.end();

  logger.info('Sent webhook digest notification. Message %s, org %s', messageId, org.id);
};

export const replaceMessageMacros = (body: string, metadata: DigestMetadata): string => {
  body = body.replace('<[[org-id]]>', metadata.org.id);
  body = body.replace('<[[dataset-id]]>', metadata.datasetId);
  body = body.replace('<[[monitor-id]]>', metadata.monitor.id);
  body = body.replace('<[[monitor-name]]>', metadata.monitor.displayName ?? metadata.monitor.id);
  body = body.replace('<[[run-id]]>', metadata.runId);
  return body;
};

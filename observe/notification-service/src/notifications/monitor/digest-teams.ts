import { getLogger } from '../../providers/logger';
import { severityToFriendlyDescriptor } from './common';
import { digestTitle } from './digest';
import { DigestTeamsHandler } from './types';
import { TeamsNotificationAction } from '@whylabs/songbird-node-client';
import * as https from 'https';

const logger = getLogger('DigestTeamsNotificationsHandler');

export const sendTeamsDigestNotification: DigestTeamsHandler = async (
  messageId,
  monitorId,
  monitorName,
  metadata,
  teamsAction: TeamsNotificationAction,
) => {
  const { org } = metadata;
  const teamsWebhook = teamsAction.webhook.trim() ?? null;
  if (!teamsWebhook) {
    throw Error(`No Teams integration key configured for org ${org.id} action ${JSON.stringify(teamsAction)}`);
  }
  const url = new URL(teamsWebhook);
  const title = digestTitle(
    monitorName ?? monitorId,
    metadata.dataset?.name ?? metadata.datasetId,
    severityToFriendlyDescriptor(metadata.severity, metadata.totalAnomalies),
  ).replace(/"/g, '*');

  const postData = JSON.stringify({
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              text: title,
              wrap: true,
            },
            {
              type: 'TextBlock',
              text: `[${metadata.dataset?.name}](${metadata.modelDashboardUrl}) ${metadata.totalAnomalies} alerts`,
              wrap: true,
            },
          ],
        },
      },
    ],
  });

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  const req = https.request(options, (res) => {
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });
  req.write(postData);
  req.end();

  logger.info('Sent Teams digest notification. Message %s, org %s', messageId, org.id);
};

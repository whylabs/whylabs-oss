import { severityToFriendlyDescriptor } from './common';
import { getLogger } from '../../providers/logger';
import { everyAnomalyTitle } from './every-anomaly';
import { EveryAnomalyMetadata, EveryAnomalyTeamsHandler } from './types';
import { TeamsNotificationAction } from '@whylabs/songbird-node-client';
import * as https from 'https';

const logger = getLogger('EveryAnomalyTeamsNotificationsHandler');

export const sendTeamsEveryAnomalyNotification: EveryAnomalyTeamsHandler = async (
  messageId: string,
  monitorId: string,
  monitorName: string | undefined,
  metadata: EveryAnomalyMetadata,
  teamsAction: TeamsNotificationAction,
) => {
  const { org } = metadata;
  const { column } = metadata.analyzerResult;
  const teamsWebhook = teamsAction.webhook.trim() ?? null;
  if (!teamsWebhook) {
    throw Error(`No Slack integration key configured for org ${org.id} action ${JSON.stringify(teamsAction)}`);
  }

  const url = new URL(teamsWebhook);
  const title = everyAnomalyTitle(
    monitorName ?? monitorId,
    metadata.dataset?.name ?? metadata.datasetId,
    column,
    severityToFriendlyDescriptor(metadata.severity),
  );

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
              text: `[${metadata.analyzerResult.column}](${
                metadata.analyzerResult.url ?? metadata.modelAlertsUrl
              }) in ${metadata.dataset?.name ?? metadata.datasetId}`,
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

  logger.info('Sent Teams every anomaly notification. Message %s, org %s', org.id, messageId);
};

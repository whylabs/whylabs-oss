import { EventPayloadV2, Image, Link } from '@pagerduty/pdjs/build/src/events';
import { sendPagerDutyMessages } from '../../services/pagerduty-wrapper';
import { MonitorModeType, severityToFriendlyDescriptor } from './common';
import { PagerDutyContent } from '../content-common';
import { everyAnomalyTitle } from './every-anomaly';
import { getLogger } from '../../providers/logger';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { transform } from 'node-json-transform';
import { anomalyMap } from '../templates/pagerduty-template';
import { EveryAnomalyMetadata, EveryAnomalyPagerDutyHandler } from './types';
import { PagerDutyNotificationAction } from '@whylabs/songbird-node-client';

const logger = getLogger('EveryAnomalyPagerDutyNotificationsHandler');

export const sendPagerDutyEveryAnomalyNotification: EveryAnomalyPagerDutyHandler = async (
  messageId: string,
  monitorId: string,
  monitorName: string | undefined,
  metadata: EveryAnomalyMetadata,
  pagerDutyAction: PagerDutyNotificationAction,
) => {
  const { org } = metadata;
  const content = getEveryAnomalyPagerDutyContent(monitorId, monitorName, metadata);

  const pagerDutyKey = pagerDutyAction.pagerDutyKey.trim() ?? null;
  if (!pagerDutyKey) {
    throw Error(`No PagerDuty integration key configured for org ${org.id} action ${JSON.stringify(pagerDutyAction)}`);
  }
  const payload = getPagerDutyPayload(pagerDutyKey, content);

  try {
    await sendPagerDutyMessages(messageId, payload, org.id);
    logger.info('Sent PagerDuty %s notification. Message %s, org %s', MonitorModeType.EveryAnomaly, messageId, org.id);
  } catch (error) {
    throw Error(
      `Failed to send PagerDuty ${MonitorModeType.EveryAnomaly} notification. Message ${JSON.stringify(payload)}`,
    );
  }
};

const getPagerDutyPayload = (pagerDutyKey: string, content: PagerDutyContent): EventPayloadV2[] => {
  const { dedupKey, summary, customDetails, imageUrls, links } = content;
  return [
    {
      routing_key: pagerDutyKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary: summary,
        source: 'whylabs',
        severity: 'error', // TODO: set severity based on monitor config
        timestamp: new Date().toISOString(),
        component: 'whylogs',
        custom_details: customDetails,
      },
      images: imageUrls,
      links: links,
    },
  ];
};

const getEveryAnomalyPagerDutyContent = (
  monitorId: string,
  monitorName: string | undefined,
  metadata: EveryAnomalyMetadata,
): PagerDutyContent => {
  const { org, analyzerResult, runId } = metadata;
  const { datasetId, column, img_url, url } = analyzerResult;

  const pagerDutyTitle = everyAnomalyTitle(
    monitorName ?? monitorId,
    metadata.dataset?.name ?? metadata.datasetId,
    column,
    severityToFriendlyDescriptor(metadata.severity),
  );

  const imageUrls: Image[] = [];
  if (img_url != null) {
    imageUrls.push({
      src: img_url,
      href: img_url,
    });
  }

  const links: Link[] = [];
  if (url != null) {
    links.push({
      href: url,
      text: url,
    });
  }

  const context = {
    org: org,
  };

  const formattedCustomDetails = transform({ ...metadata, ...analyzerResult }, anomalyMap, context);
  return {
    dedupKey: `${MonitorModeType.EveryAnomaly}-${datasetId}-${monitorId}-${runId}`,
    summary: pagerDutyTitle,
    customDetails: formattedCustomDetails,
    imageUrls: imageUrls,
    links: links,
  };
};

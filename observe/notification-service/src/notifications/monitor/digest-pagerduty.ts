import { EventPayloadV2 } from '@pagerduty/pdjs/build/src/events';
import { sendPagerDutyMessages } from '../../services/pagerduty-wrapper';
import { PagerDutyContent } from '../content-common';
import { MonitorModeType, severityToFriendlyDescriptor } from './common';
import { digestTitle } from './digest';
import { getLogger } from '../../providers/logger';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { transform } from 'node-json-transform';
import { pagerdutyDigestMap } from '../templates/pagerduty-template';

import { DigestMetadata, DigestPagerDutyHandler } from './types';
import { PagerDutyNotificationAction } from '@whylabs/songbird-node-client';

const logger = getLogger('DigestPagerDutyNotificationsHandler');

export const sendDigestPagerDutyNotification: DigestPagerDutyHandler = async (
  messageId: string,
  monitorId: string,
  monitorDisplayName: string | undefined,
  metadata: DigestMetadata,
  pagerDutyAction: PagerDutyNotificationAction,
) => {
  const { org } = metadata;
  const { dedupKey, summary, customDetails } = getDigestPagerDutyContent(monitorId, monitorDisplayName, metadata);
  const pagerDutyKey = pagerDutyAction.pagerDutyKey.trim() ?? null;
  if (!pagerDutyKey) {
    throw Error(`No PagerDuty integration key configured for org ${org.id} action ${JSON.stringify(pagerDutyAction)}`);
  }

  const payload: EventPayloadV2[] = getPagerDutyPayload(pagerDutyKey, dedupKey, summary, customDetails);
  await sendPagerDutyMessages(messageId, payload, org.id);
  logger.info('Sent PagerDuty %s notification. Message %s, org %s', MonitorModeType.Digest, messageId, org.id);
};

const getDigestPagerDutyContent = (
  monitorId: string,
  monitorName: string | undefined,
  metadata: DigestMetadata,
): PagerDutyContent => {
  const { runId, datasetId, dataset, severity, org, start, end, totalAnomalies } = metadata;

  const pagerDutyTitle = digestTitle(
    monitorName ?? monitorId,
    dataset?.name ?? datasetId,
    severityToFriendlyDescriptor(severity, totalAnomalies),
  );

  const context = {
    org: org,
    datasetId: datasetId,
    start: start,
    end: end,
  };

  // apply notification templates - to make org specific customisation
  const formattedCustomDetails = transform(metadata, pagerdutyDigestMap, context);

  return {
    dedupKey: `${MonitorModeType.Digest}-${datasetId}-${monitorId}-${runId}`,
    summary: pagerDutyTitle,
    customDetails: formattedCustomDetails,
  };
};

const getPagerDutyPayload = (
  pagerDutyKey: string,
  dedupKey: string,
  summary: string,
  customDetails: JSON,
): EventPayloadV2[] => {
  return [
    {
      routing_key: pagerDutyKey,
      event_action: 'trigger',
      dedup_key: dedupKey,
      payload: {
        component: 'whylogs',
        source: 'whylabs',
        severity: 'error', // TODO: set severity based on monitor config
        timestamp: new Date().toISOString(),
        summary: summary,
        custom_details: customDetails,
      },
    },
  ];
};

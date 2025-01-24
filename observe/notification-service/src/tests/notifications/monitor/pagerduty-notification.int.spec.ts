import { processDigestNotificationMetadata } from '../../../notifications/monitor/digest';
import { digestTestMessageWithoutImages, everyAnomalyTestMessageWithoutImage } from '../../data/test-messages';
import { v4 as uuid } from 'uuid';
import { getNotification } from './common';
import { NotificationType } from '../../../notifications/digest-v2/digest-notifier';
import assert from 'assert';
import { sendDigestPagerDutyNotification } from '../../../notifications/monitor/digest-pagerduty';
import { DigestPagerDutyContent, EveryAnomalyPagerDutyContent } from '../../data/pagerduty-test-data';
import { processEveryAnomalyNotificationMetadata } from '../../../notifications/monitor/every-anomaly';
import { sendPagerDutyEveryAnomalyNotification } from '../../../notifications/monitor/every-anomaly-pagerduty';
import { config } from '../../../config';

describe('pagerduty notification', () => {
  it(
    'digest mode - check pager dedupe key and summary is as expected',
    async () => {
      const metadata = await processDigestNotificationMetadata(digestTestMessageWithoutImages);
      const messageId = `messageId-${uuid()}`;
      await sendDigestPagerDutyNotification(messageId, metadata.monitor.id, metadata.monitor.displayName, metadata, {
        pagerDutyKey: 'c42c44d58c974e09d0fe246a02069e30',
      });
      const actual = JSON.parse(await getNotification(metadata.org.id, messageId, NotificationType.PAGERDUTY))[0];
      const expectedDedupeKey = `DIGEST-${config.test.datasetId}-${config.test.monitorId}-ec88d889-0f6b-4df0-bf6f-1158a4f28dd1`;
      const expectedSummary = `Alert: Your monitor "${config.test.monitorDisplayName}" on dataset "${config.test.datasetName}" detected 14 low severity issues`;

      assert(actual.dedup_key === expectedDedupeKey, `actual=${actual.dedup_key} expected=${expectedDedupeKey}`);
      assert(
        actual.payload.summary === expectedSummary,
        `actual=${actual.payload.summary} expected=${expectedSummary}`,
      );
    },
    15 * 1000,
  );

  it(
    'digest mode - simple pager duty end to end test (without images)',
    async () => {
      const metadata = await processDigestNotificationMetadata(digestTestMessageWithoutImages);
      const messageId = `messageId-${uuid()}`;
      await sendDigestPagerDutyNotification(messageId, metadata.monitor.id, metadata.monitor.displayName, metadata, {
        pagerDutyKey: 'c42c44d58c974e09d0fe246a02069e30',
      });
      const actual = JSON.parse(await getNotification(metadata.org.id, messageId, NotificationType.PAGERDUTY))[0];
      // blank out timestamp for equality check
      actual.payload.timestamp = '';
      DigestPagerDutyContent.payload.timestamp = '';

      assert(
        JSON.stringify(actual) === JSON.stringify(DigestPagerDutyContent),
        `expected=${JSON.stringify(DigestPagerDutyContent)} actual=${JSON.stringify(actual)}`,
      );
    },
    15 * 1000,
  );

  it(
    'every anomaly mode - simple pager duty end to end test (without images)',
    async () => {
      const metadata = await processEveryAnomalyNotificationMetadata(everyAnomalyTestMessageWithoutImage);
      const messageId = `messageId-${uuid()}`;
      await sendPagerDutyEveryAnomalyNotification(
        messageId,
        metadata.monitor.id,
        metadata.monitor.displayName,
        metadata,
        {
          pagerDutyKey: 'c42c44d58c974e09d0fe246a02069e30',
        },
      );
      const actual = JSON.parse(await getNotification(metadata.org.id, messageId, NotificationType.PAGERDUTY))[0];
      actual.payload.timestamp = '';
      EveryAnomalyPagerDutyContent.payload.timestamp = '';

      assert(
        JSON.stringify(actual) === JSON.stringify(EveryAnomalyPagerDutyContent),
        `expected=${JSON.stringify(EveryAnomalyPagerDutyContent)} actual=${JSON.stringify(actual)}`,
      );
    },
    15 * 1000,
  );

  it(
    'every anomaly mode - check pager dedupe key and summary is as expected',
    async () => {
      const metadata = await processEveryAnomalyNotificationMetadata(everyAnomalyTestMessageWithoutImage);
      const messageId = `messageId-${uuid()}`;
      await sendPagerDutyEveryAnomalyNotification(
        messageId,
        metadata.monitor.id,
        metadata.monitor.displayName,
        metadata,
        {
          pagerDutyKey: 'c42c44d58c974e09d0fe246a02069e30',
        },
      );
      const actual = JSON.parse(await getNotification(metadata.org.id, messageId, NotificationType.PAGERDUTY))[0];
      const expectedDedupeKey = `EVERY_ANOMALY-${config.test.datasetId}-${config.test.monitorId}-d3d6a1ad-d09c-4779-9033-baa077ff5fc8`;
      const expectedSummary = `Anomaly: Your monitor "${config.test.monitorDisplayName}" on feature "${config.test.columnName}" from dataset "${config.test.datasetName}" detected a low severity issue`;

      assert(actual.dedup_key === expectedDedupeKey, `actual=${actual.dedup_key} expected=${expectedDedupeKey}`);
      assert(
        actual.payload.summary === expectedSummary,
        `actual=${actual.payload.summary} expected=${expectedSummary}`,
      );
    },
    15 * 1000,
  );
});

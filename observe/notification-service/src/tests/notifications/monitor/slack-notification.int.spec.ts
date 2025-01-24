import { processDigestNotificationMetadata } from '../../../notifications/monitor/digest';
import { digestTestMessageWithoutImages, everyAnomalyTestMessageWithoutImage } from '../../data/test-messages';
import { v4 as uuid } from 'uuid';
import { getNotification } from './common';
import { NotificationType } from '../../../notifications/digest-v2/digest-notifier';
import assert from 'assert';
import { processEveryAnomalyNotificationMetadata } from '../../../notifications/monitor/every-anomaly';
import { sendSlackDigestNotification } from '../../../notifications/monitor/digest-slack';
import { SlackDigestContent, SlackEveryAnomalyContent } from '../../data/slack-test-data';
import { sendSlackEveryAnomalyNotification } from '../../../notifications/monitor/every-anomaly-slack';

describe('slack notification', () => {
  it(
    'digest mode - simple email end to end test (without images)',
    async () => {
      const metadata = await processDigestNotificationMetadata(digestTestMessageWithoutImages);
      const messageId = `messageId-${uuid()}`;
      await sendSlackDigestNotification(messageId, metadata.monitor.id, metadata.monitor.displayName, metadata, {
        slackWebhook: 'https://hooks.slack.com/services/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',
      });
      const actual = await getNotification(metadata.org.id, messageId, NotificationType.SLACK);
      assert(
        JSON.stringify(JSON.parse(actual)) === JSON.stringify(SlackDigestContent),
        `expected=${JSON.stringify(SlackDigestContent)} actual=${JSON.stringify(JSON.parse(actual))}`,
      );
    },
    15 * 1000,
  );

  it(
    'every anomaly mode - simple email end to end test (without images)',
    async () => {
      const metadata = await processEveryAnomalyNotificationMetadata(everyAnomalyTestMessageWithoutImage);
      const messageId = `messageId-${uuid()}`;
      await sendSlackEveryAnomalyNotification(messageId, metadata.monitor.id, metadata.monitor.displayName, metadata, {
        slackWebhook: 'https://hooks.slack.com/services/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',
      });
      const actual = await getNotification(metadata.org.id, messageId, NotificationType.SLACK);
      assert(
        JSON.stringify(JSON.parse(actual)) === JSON.stringify(SlackEveryAnomalyContent),
        `expected=${JSON.stringify(SlackEveryAnomalyContent)} actual=${JSON.stringify(JSON.parse(actual))}`,
      );
    },
    15 * 1000,
  );
});

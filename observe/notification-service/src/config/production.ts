import { Configuration } from '../config';

export const config: Configuration = {
  defaultUrlDomain: 'https://hub.whylabsapp.com',
  environment: 'production',
  region: 'us-west-2',
  sqs: {
    userMembershipNotificationQueueName: process.env['USER_MEMBERSHIP_QUEUE_NAME'],
    monitorNotificationQueueName: process.env['SIREN_NOTIFICATION_TOPIC'],
    testNotificationQueueName: process.env['TEST_NOTIFICATION_QUEUE_NAME'],
    pollIntervalMs: 10 * 1000,
    maxNumberOfMessages: 10,
    longPollSeconds: 10,
  },
  ses: {
    fromName: 'WhyLabs Monitor',
    fromEmail: process.env['FROM_EMAIL'] ?? 'do-not-reply@whylabs.ai',
  },
  songbird: {},
  test: {
    orgId: 'org-RBz45p',
    monitorId: 'uninterested-royalblue-cattle-3943',
    monitorDisplayName: 'uninterested-royalblue-cattle-3943',
    datasetId: 'model-1',
    datasetName: 'Demo - Historic Data',
    columnName: 'auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed',
  },
};

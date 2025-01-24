import { Configuration } from '../config';

export const config: Configuration = {
  defaultUrlDomain: 'https://observatory.development.whylabsdev.com',
  environment: 'development',
  region: 'us-west-2',
  sqs: {
    userMembershipNotificationQueueName: process.env['USER_MEMBERSHIP_QUEUE_NAME'],
    monitorNotificationQueueName: process.env['SIREN_NOTIFICATION_TOPIC'],
    testNotificationQueueName: process.env['TEST_NOTIFICATION_QUEUE_NAME'],
    pollIntervalMs: 5 * 1000,
    maxNumberOfMessages: 10,
    longPollSeconds: 5,
  },
  ses: {
    fromName: 'WhyLabs Monitor - Development',
    fromEmail: process.env['FROM_EMAIL'] ?? 'from@example.com',
  },
  songbird: {},
  test: {
    orgId: 'org-gWtdtQ',
    monitorId: 'attractive-ghostwhite-swan-8229',
    monitorDisplayName: 'attractive-ghostwhite-swan-8229',
    datasetId: 'model-1',
    datasetName: 'Demo - Historic Data',
    columnName: 'auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed',
  },
};

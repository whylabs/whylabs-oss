import { config } from '../../config';

export const SlackDigestContent = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Alert: Your monitor *attractive-ghostwhite-swan-8229* on dataset *Demo - Historic Data* detected 14 low severity issues',
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '<https://observatory.development.whylabsdev.com/resources/model-1?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ|Demo - Historic Data> - 14 alerts',
      },
    },
    { type: 'section', text: { type: 'mrkdwn', text: '*Top Alerted Features*' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '<https://observatory.development.whylabsdev.com/resources/model-1/columns/auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ|auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed> - 14 alerts',
      },
    },
    { type: 'section', text: { type: 'mrkdwn', text: '*Top Alerted Segments*' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '<https://observatory.development.whylabsdev.com/resources/model-1/columns/auth_amount_streak_length_by_browser_fingerprint_from_payment_browser_fingerprint_rehashed?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ|Overall segment> - 14 alerts',
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Demo - Historic Data', emoji: true },
          url: 'https://observatory.development.whylabsdev.com/resources/model-1?startDate=2022-05-03&endDate=2022-05-16&targetOrgId=org-gWtdtQ',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Monitor Manager', emoji: true },
          url: 'https://observatory.development.whylabsdev.com/resources/model-1/monitor-manager?targetOrgId=org-gWtdtQ',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Notification Settings', emoji: true },
          url: 'https://observatory.development.whylabsdev.com/settings/notifications?targetOrgId=org-gWtdtQ',
        },
      ],
    },
  ],
  attachments: [],
};

export const SlackEveryAnomalyContent = {
  blocks: [
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: `Anomaly: Your monitor "${config.test.monitorDisplayName}" on feature "${config.test.columnName}" from dataset "${config.test.datasetName}" detected a low severity issue`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`{"id":"e137963f-1dfc-325f-8a41-18ca0f402864","analysis_id":"6095cab8-3c42-3f6f-8dbe-2c2da1f8601e","analyzer_id":"missing-values-ratio-analyzer","creation_timestamp":1660241078109,"dataset_id":"${config.test.datasetId}","dataset_timestamp":1660089600000,"feature":"${config.test.columnName}","granularity":"DAYS","metric":"count_null_ratio","run_id":"d3d6a1ad-d09c-4779-9033-baa077ff5fc8","segment":"","target_level":"column","type":"stddev","url":"https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}/columns/${config.test.columnName}?targetOrgId=${config.test.orgId}","weight":1}\``,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\n<https://observatory.development.whylabsdev.com/resources/${config.test.datasetId}/columns/${config.test.columnName}?targetOrgId=${config.test.orgId}>`,
      },
    },
  ],
  attachments: [],
};

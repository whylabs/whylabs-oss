import { Configuration } from '../config';

export const config: Configuration = {
  region: 'us-west-2',
  ddCspReportingUrl: '/__ignore_me_no_local_csp_reporting',
  analytics: {
    heapAppId: process.env['HEAP_APP_ID'] || '',
    googleAppId: '',
    pendoSubId: process.env['PENDO_SUB_ID'] ?? '',
  },
  networking: {
    keepAliveTimeout: 61 * 1000,
    headersTimeout: 70 * 1000,
  },
  storage: {
    cloudWatchAuditLogGroup: process.env['AUDIT_LOG_GROUP'],
    cloudWatchAuditLogStream: process.env['AUDIT_LOG_STREAM'],
    metadataBucket: process.env['METADATA_BUCKET'],
  },
  songbird: {},
  feedbackSecretId: 'feedback-webhook',
};

import { Configuration } from '../config';

export const config: Configuration = {
  region: 'us-west-2',
  ddCspReportingUrl: '',
  analytics: {
    heapAppId: process.env['HEAP_APP_ID'] || '68229313',
    googleAppId: '',
    pendoSubId: process.env['PENDO_SUB_ID'] ?? '6523062022176768',
  },
  networking: {
    keepAliveTimeout: 61 * 1000,
    headersTimeout: 70 * 1000,
  },
  storage: {
    cloudWatchAuditLogGroup: process.env['AUDIT_LOG_GROUP'] || 'development/service/dashboard/audit-logs',
    cloudWatchAuditLogStream: process.env['AUDIT_LOG_STREAM'] || 'dashboard-audit-log-stream-edeed16',
    metadataBucket: process.env['METADATA_BUCKET'] || 'development-db-metadata-20211118232856376200000001',
  },
  songbird: {},
  feedbackSecretId: 'development/feedback-webhook',
};

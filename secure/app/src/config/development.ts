import { Configuration } from '../config';
import { ddCspReportingUrl } from './ddconfig';

export const config: Configuration = {
  region: 'us-west-2',
  ddCspReportingUrl: ddCspReportingUrl('development', 'us-west-2'),
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

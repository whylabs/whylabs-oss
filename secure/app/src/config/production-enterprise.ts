import { Configuration } from '../config';
import { ddCspReportingUrl } from './ddconfig';

export const config: Configuration = {
  region: 'us-west-2',
  ddCspReportingUrl: ddCspReportingUrl('production', 'us-west-2'),
  networking: {
    keepAliveTimeout: 61 * 1000,
    headersTimeout: 70 * 1000,
  },
  storage: {
    cloudWatchAuditLogGroup: process.env['AUDIT_LOG_GROUP'],
    cloudWatchAuditLogStream: process.env['AUDIT_LOG_STREAM'],
    metadataBucket: process.env['METADATA_BUCKET'] || 'production-enterprise-db-metadata-20211120005745970100000001',
  },
  songbird: {},
};

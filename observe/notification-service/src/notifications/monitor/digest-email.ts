import { sendEmail } from '../../services/email-wrapper';
import { DigestEmailFeaturesSegment } from '../content-common';
import { digestTitle } from './digest';
import { getLogger } from '../../providers/logger';
import { generateLink, severityToFriendlyDescriptor, severityToString } from './common';
import { DigestMetadata, DigestEmailHandler } from './types';
import { EmailNotificationAction, OrganizationMetadata } from '@whylabs/songbird-node-client';
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import { getAnalyzer, listConstraints } from '../../services/data/songbird/songbird-wrapper';
import { mapStringToTimePeriod } from '../../util/batchProfileUtils';

const logger = getLogger('DigestEmailNotificationsHandler');

interface EmailDigestOptions {
  metadata: DigestMetadata;
  org: OrganizationMetadata;
  startDate: string;
  endDate: string;
  logo: string;
  severity: string;
  datasetName: string;
  monitorName: string;
  datasetMetricName: string;
  datasetMetricType: string;
  segmentList: string;
  hasTraceIds: boolean;
  traceIds: string[];
  analyzerId: string;
  constraintDefinition: string;
  numAnomalies: number;
  featuresSummary: DigestEmailFeaturesSegment[];
}

const constraintEmailTemplate = fs.readFileSync(
  path.join(__dirname, '../../../email-templates/constraint-digest-template.hbs'),
);

const datasetMetricEmailTemplate = fs.readFileSync(
  path.join(__dirname, '../../../email-templates/dataset-digest-template.hbs'),
);

const digestEmailTemplate = fs.readFileSync(
  path.join(__dirname, '../../../email-templates/digest-notification-template.hbs'),
);

export const sendEmailDigestNotificationV2: DigestEmailHandler = async (
  messageId,
  monitorId,
  monitorName,
  metadata,
  emailAction: EmailNotificationAction,
) => {
  const { org } = metadata;
  if (metadata.anomalySample.length == 0) {
    logger.error('No anomaly samples found for monitor %s. Cannot build out notification digest.', monitorId);
    return;
  }
  const datasetId = metadata.datasetId;
  const analyzerId = metadata.anomalySample[0].analyzerId;
  const analyzer = await getAnalyzer(metadata.org.id, datasetId, analyzerId);
  const logo = 'https://whylabs-static.s3.us-west-2.amazonaws.com/image/notification/whylabs-logo.png';

  const startDate = new Date(metadata.start);
  const endDate = new Date(metadata.end);
  const emailSubject = digestTitle(
    monitorName ?? monitorId,
    metadata.dataset?.name ?? metadata.datasetId,
    severityToFriendlyDescriptor(metadata.severity, metadata.totalAnomalies),
  );
  const severity = severityToString(metadata.severity);
  const segmentList = metadata.segmentAnomalies
    .filter((segmentStat) => segmentStat.segment != '')
    .map((segmentStat) => segmentStat.segment)
    .join(' ');
  const emptyTraceIds: string[] = [];
  const timePeriod = mapStringToTimePeriod.get(metadata?.dataset?.timePeriod ?? '');
  const featuresSummary: DigestEmailFeaturesSegment[] = metadata.featureAnomalies.map((featureStat) => {
    const start = new Date(featureStat.earliestAnomalyDatasetTimestamp);
    const end = new Date(featureStat.oldestAnomalyDatasetTimestamp);
    const segments: string[] = [];
    const columnSchema = metadata.entitySchema?.columns[featureStat.column];
    metadata.segmentAnomalies.forEach((segmentStat) => {
      if (segmentStat.columns.includes(featureStat.column)) {
        if (segmentStat.segment == '') {
          segments.push('Overall segment');
        } else {
          segments.push(segmentStat.segment);
        }
      }
    });
    return {
      name: featureStat.column,
      link:
        featureStat.url ??
        generateLink(
          metadata.org,
          'column',
          metadata.datasetId,
          [featureStat.column],
          null,
          start,
          end,
          timePeriod,
          columnSchema,
        ),
      num_anomalies: featureStat.numAnomalies,
      segments: segments,
    };
  });
  const emailOptions = {
    metadata: metadata,
    org: org,
    startDate: formatUTCDateTime(startDate),
    endDate: formatUTCDateTime(endDate),
    logo: logo,
    severity: severity.charAt(0).toUpperCase() + severity.slice(1),
    datasetName: metadata.dataset?.name ?? metadata.datasetId,
    datasetMetricName: analyzer?.config?.metric ?? monitorName ?? monitorId,
    datasetMetricType: 'Performance',
    monitorName: monitorName ?? monitorId,
    segmentList: segmentList,
    analyzerId: analyzerId,
    hasTraceIds: false,
    traceIds: emptyTraceIds,
    constraintDefinition: '',
    numAnomalies: metadata.totalAnomalies,
    featuresSummary: featuresSummary,
  };

  if (analyzer?.tags?.includes('whylabs.constraint')) {
    const constraints = await listConstraints(org.id, datasetId);
    const constraint = constraints.find((c) => c.id === analyzerId);
    const constraintDefinition = constraint?.constraintDefinition ?? analyzerId;

    const emailDigestTemplate = handlebars.compile<EmailDigestOptions>(constraintEmailTemplate.toString());
    emailOptions.constraintDefinition = constraintDefinition;
    const isStr = (item: string | undefined): item is string => {
      return !!item;
    };
    emailOptions.traceIds = metadata.anomalySample
      .map((anomaly) => anomaly.traceIds)
      .flat()
      .filter(isStr)
      .filter((value, index, array) => array.indexOf(value) === index)
      .splice(0, 100); // remove duplicates
    if (emailOptions.traceIds.length > 0) {
      emailOptions.hasTraceIds = true;
    }
    const emailBody = emailDigestTemplate(emailOptions);
    const toAddresses = [emailAction.email.trim()];
    await sendEmail(messageId, { body: emailBody, subject: emailSubject }, org, toAddresses);
  } else if (analyzer?.targetMatrix?.type == 'dataset') {
    switch (analyzer.config?.metric) {
      case 'secondsSinceLastUpload':
        emailOptions.datasetMetricName = 'Late Upload Monitor';
        emailOptions.datasetMetricType = 'Integration';
        break;
      case 'missingDatapoint':
        emailOptions.datasetMetricName = 'Missing Profile Monitor';
        emailOptions.datasetMetricType = 'Integration';
        break;
      case 'profileCount':
      case 'profile.last_ingestion_time':
      case 'profile.first_ingestion_time':
        emailOptions.datasetMetricName = 'Profile Ingestion Monitor';
        emailOptions.datasetMetricType = 'Integration';
        break;
    }
    const emailDigestTemplate = handlebars.compile<EmailDigestOptions>(datasetMetricEmailTemplate.toString());
    const emailBody = emailDigestTemplate(emailOptions);
    const toAddresses = [emailAction.email.trim()];
    await sendEmail(messageId, { body: emailBody, subject: emailSubject }, org, toAddresses);
  } else {
    const emailDigestTemplate = handlebars.compile<EmailDigestOptions>(digestEmailTemplate.toString());
    const emailBody = emailDigestTemplate(emailOptions);
    const toAddresses = [emailAction.email.trim()];
    await sendEmail(messageId, { body: emailBody, subject: emailSubject }, org, toAddresses);
  }
};

const formatUTCDateTime = (date: Date): string => {
  return `${date.getUTCFullYear()}-${padzeros(date.getUTCMonth() + 1, 2)}-${padzeros(date.getUTCDate(), 2)} ${padzeros(
    date.getUTCHours(),
    2,
  )}:${padzeros(date.getUTCMinutes(), 2)} UTC`;
};

const padzeros = (num: number, padding: number): string => {
  let s = num.toString();
  if (s.length < padding) {
    s = '0' + s;
  }
  return s;
};

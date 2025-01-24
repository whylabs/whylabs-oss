import { sendEmail } from '../../services/email-wrapper';
import { severityToFriendlyDescriptor, severityToString } from './common';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { transform } from 'node-json-transform';
import { EveryAnomalyMetadata, EveryAnomalyEmailHandler } from './types';
import { EmailNotificationAction, OrganizationMetadata } from '@whylabs/songbird-node-client';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';

interface EmailEveryAnomalyOptions {
  metadata: EveryAnomalyMetadata;
  org: OrganizationMetadata;
  logo: string;
  severity: string;
  datasetName: string;
  featureName: string;
  featureUrl: string;
}

const everyAnomalyEmailTemplate = fs.readFileSync(
  path.join(__dirname, '../../../email-templates/every-anomaly-template.hbs'),
);

export const sendEmailEveryAnomalyNotificationV2: EveryAnomalyEmailHandler = async (
  messageId,
  monitorId,
  monitorName,
  metadata,
  emailAction: EmailNotificationAction,
) => {
  const { org } = metadata;

  const logo = 'https://whylabs-static.s3.us-west-2.amazonaws.com/image/notification/whylabs-logo.png';
  const severity = severityToString(metadata.severity);
  const emailSubject = `Anomaly: Your monitor "${monitorName ?? monitorId}" from dataset "${
    metadata.dataset?.name ?? metadata.datasetId
  }" detected ${severityToFriendlyDescriptor(metadata.severity)}`;
  const emailOptions = {
    metadata: metadata,
    org: org,
    logo: logo,
    severity: severity.charAt(0).toUpperCase() + severity.slice(1),
    datasetName: metadata.dataset?.name ?? metadata.datasetId,
    featureName: metadata.analyzerResult.column,
    featureUrl: metadata.analyzerResult.url ?? metadata.modelAlertsUrl,
  } as EmailEveryAnomalyOptions;

  // TODO: handle specific cases of __internal__ metrics
  if (metadata.analyzerResult.column.startsWith('__internal__')) {
    emailOptions.featureName = metadata.analyzerResult.metric ?? metadata.analyzerResult.analyzerId;
    emailOptions.featureUrl = metadata.modelAlertsUrl;
  }

  const emailEveryAnomalyTemplate = handlebars.compile<EmailEveryAnomalyOptions>(everyAnomalyEmailTemplate.toString());
  const emailBody = emailEveryAnomalyTemplate(emailOptions);
  const toAddresses = [emailAction.email.trim()];
  await sendEmail(messageId, { body: emailBody, subject: emailSubject }, org, toAddresses);
};

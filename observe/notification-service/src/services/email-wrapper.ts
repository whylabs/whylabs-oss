import { getLogger } from '../providers/logger';
import { ses } from '../providers/aws';
import { SendEmailRequest } from '@aws-sdk/client-ses';

import { config } from '../config';
import { EmailContent } from '../notifications/content-common';
import { NotificationType } from '../notifications/digest-v2/digest-notifier';
import { logNotification } from './notification-logger';

const logger = getLogger('EmailNotificationsWrapper');

const { fromName, fromEmail } = config.ses;

export const sendEmail = async (
  messageId: string,
  content: EmailContent,
  org: { id: string },
  toAddresses: string[],
): Promise<void> => {
  const { id: orgId } = org;
  logger.info('Sending email via SES to org %s', orgId);

  const params: SendEmailRequest = {
    Source: `"${fromName}" <${fromEmail}>`,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: {
        Data: content.subject,
      },
      Body: {
        Html: {
          Data: content.body,
        },
      },
    },
  };

  try {
    const response = await ses.sendEmail(params);
    logger.info('Successfully sent email via SES for org %s. Message id: %s', orgId, response.MessageId);
    await logNotification(messageId, NotificationType.EMAIL, orgId, content.body);
  } catch (err) {
    logger.error(err, 'Failed to send email via SES for org %s.', orgId);
    throw err;
  }
};

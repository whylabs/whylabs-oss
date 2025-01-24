import { NotificationType } from '../notifications/digest-v2/digest-notifier';
import { getLogger } from '../providers/logger';
import { writeObject } from './data/s3-connector';

import { config } from '../config';
import { fnThrow } from '../util/misc';
const { metadataBucketName } = config;

const logger = getLogger('NotificationLoggerLogger');

export const getNotificationS3Path = (
  messageId: string,
  type: NotificationType,
  orgId: string,
): { bucket: string; key: string } => {
  const now = new Date();
  const extension = type === NotificationType.EMAIL ? 'html' : 'json';
  const bucket = metadataBucketName ?? fnThrow('Missing or invalid bucket name in config');
  const key = `notifications/${orgId}/${type}/${now.getUTCFullYear()}/${
    now.getUTCMonth() + 1
  }/${now.getUTCDate()}/${messageId}.${extension}`;
  return {
    bucket,
    key: key,
  };
};

/**
 * Save the notification content for debugging purposes.
 * Does not throw.
 * @param messageId
 * @param type
 * @param orgId
 * @param content
 */
export const logNotification = async (
  messageId: string,
  type: NotificationType,
  orgId: string,
  content: string,
): Promise<void> => {
  try {
    logger.info('Saving content for message %s, org %s, type %s', messageId, orgId, type);
    const { bucket, key } = getNotificationS3Path(messageId, type, orgId);
    await writeObject(bucket, key, content);
  } catch (err) {
    logger.error(
      err,
      'Failed to persist notification when sending msg %s for org %s of type %s',
      messageId,
      orgId,
      type,
    );
  }
};

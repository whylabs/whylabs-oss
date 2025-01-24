import { NotificationType } from '../../../notifications/digest-v2/digest-notifier';
import { getNotificationS3Path } from '../../../services/notification-logger';
import { getObject } from '../../../services/data/s3-connector';
import { getLogger } from '../../../providers/logger';

const logger = getLogger('test-common');

export const getNotification = async (
  orgId: string,
  expectedMessageId: string,
  expectedMessageType: NotificationType,
): Promise<string> => {
  const { bucket, key } = getNotificationS3Path(expectedMessageId, expectedMessageType, orgId);
  logger.info('fetching notification from bucket %s, key %s', bucket, key);
  const loggedNotification = await getObject(bucket, key);

  if (!loggedNotification) {
    throw Error(`Could not find notification for message ${expectedMessageId}`);
  }
  return loggedNotification.toString();
};
